#include "Report.h"
#include "DashboardPage.h"
#include "FileStorage.h"
#include "Inventory.h"
#include <chrono>
#include <iomanip>
#include <ostream>
#include <sstream>
#include <string_view>

namespace {
    void jsonString(std::ostream& out, std::string_view value) {
        constexpr char hex[] = "0123456789abcdef";
        out.put('"');
        for (unsigned char c : value) {
            switch (c) {
            case '"': out << "\\\""; break;
            case '\\': out << "\\\\"; break;
            case '<': out << "\\u003c"; break; // Keep literal HTML tags out of the script data.
            default:
                if (c < 32) out << "\\u00" << hex[c >> 4] << hex[c & 15];
                else out.put(static_cast<char>(c));
            }
        }
        out.put('"');
    }

    void writeProducts(std::ostream& out, const Inventory& inventory) {
        const auto& products = inventory.products();
        for (std::size_t i = 0; i < products.size(); ++i) {
            if (i != 0) out << ',';
            const auto& p = products[i];
            out << "{\"id\":" << p.id << ",\"name\":";
            jsonString(out, p.name);
            out << ",\"barcode\":";
            jsonString(out, p.barcode);
            out << ",\"qr\":";
            jsonString(out, p.qrPayload);
            out << ",\"price\":\"" << p.priceCents << "\",\"minimum\":" << p.minimumStock
                << ",\"stock\":[";
            bool first = true;
            for (const auto& [location, quantity] : p.stock) {
                if (!first) out << ',';
                out << '[';
                jsonString(out, location);
                out << ',' << quantity << ']';
                first = false;
            }
            out << "]}";
        }
    }

    void writeMovements(std::ostream& out, const Inventory& inventory) {
        const auto& movements = inventory.movements();
        for (std::size_t i = 0; i < movements.size(); ++i) {
            if (i != 0) out << ',';
            const auto& m = movements[i];
            out << "{\"type\":";
            jsonString(out, movementName(m.type));
            out << ",\"product\":" << m.productId << ",\"units\":" << m.quantity
                << ",\"time\":" << m.recordedAt << ",\"from\":";
            jsonString(out, m.from);
            out << ",\"to\":";
            jsonString(out, m.to);
            out << ",\"business\":";
            jsonString(out, m.business);
            out << ",\"reference\":";
            jsonString(out, m.reference);
            out << ",\"price\":";
            if (m.isTrade()) out << '"' << m.unitPriceCents << '"';
            else out << "null";
            out << '}';
        }
    }
}

std::string inventoryListValue(const Inventory& inventory) {
    constexpr std::int64_t dollarsPerBlock = 1'000'000'000'000;
    constexpr std::int64_t centsPerBlock = dollarsPerBlock * 100;
    std::int64_t blocks = 0;
    std::int64_t remainder = 0;
    for (const auto& product : inventory.products()) {
        for (const auto& [location, quantity] : product.stock) {
            // Whole dollars for one location fit in int64_t at the product price limit.
            const auto cents = (product.priceCents % 100) * quantity;
            const auto dollars = (product.priceCents / 100) * quantity + cents / 100;
            blocks += dollars / dollarsPerBlock;
            remainder += (dollars % dollarsPerBlock) * 100 + cents % 100;
            blocks += remainder / centsPerBlock;
            remainder %= centsPerBlock;
        }
    }
    std::ostringstream value;
    value << std::setfill('0');
    if (blocks != 0) value << blocks << std::setw(12);
    value << remainder / 100 << '.' << std::setw(2) << remainder % 100;
    return value.str();
}

bool exportDashboard(const Inventory& inventory, const std::filesystem::path& destination) {
    return writeFileAtomically(destination, FileWriteMode::Create, [&](std::ostream& out) {
        const auto generatedAt = std::chrono::floor<std::chrono::seconds>(
            std::chrono::system_clock::now()).time_since_epoch().count();

        out << dashboard::start << "{\"generatedAt\":" << generatedAt << ",\"products\":[";
        writeProducts(out, inventory);
        out << "],\"movements\":[";
        writeMovements(out, inventory);
        out << "]}" << dashboard::end;
    });
}
