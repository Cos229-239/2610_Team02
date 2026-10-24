#include "Portfolio.h"
#include <iomanip>
#include <fstream>
#include <iostream>
#include <limits>
#include <string>

namespace {
    Portfolio portfolio;
    bool persistenceEnabled = true;
    constexpr const char* kDataFile = "towerflow.dat";

    bool SavePortfolio() {
        if (!persistenceEnabled) {
            std::cerr << "WARNING: Saving disabled because the existing portfolio file could not be loaded safely.\n";
            return false;
        }
        if (portfolio.Save(kDataFile)) return true;
        std::cerr << "WARNING: Could not save portfolio to " << kDataFile << ".\n";
        return false;
    }

    bool ReadNumber(const char* prompt, double& value) {
        std::cout << prompt;
        if (std::cin >> value && value >= 0) return true;
        std::cin.clear();
        std::cin.ignore((std::numeric_limits<std::streamsize>::max)(), '\n');
        std::cout << "Invalid number.\n";
        return false;
    }

    void ShowPortfolio() {
        std::cout << "\n=== TOWERFLOW PORTFOLIO ===\n"
                  << std::fixed << std::setprecision(2)
                  << "Cash:         $" << portfolio.Cash() << '\n'
                  << "Holdings:     $" << portfolio.MarketValue() << '\n'
                  << "Total value:  $" << portfolio.TotalValue() << '\n'
                  << "Invested:     $" << portfolio.InvestedCost() << '\n'
                  << "Unrealized P/L: $" << portfolio.ProfitLoss() << "\n\n";

        for (const auto& [symbol, p] : portfolio.Holdings()) {
            std::cout << symbol << " | " << p.asset.name
                      << " | Shares: " << p.shares
                      << " | Price: $" << p.asset.price
                      << " | Value: $" << p.asset.Value(p.shares) << '\n';
        }
        if (portfolio.Holdings().empty()) std::cout << "No holdings yet.\n";
    }

    void ShowHistory() {
        std::cout << "\n=== TRANSACTION HISTORY ===\n";
        for (const auto& t : portfolio.History())
            std::cout << t.timestamp << " | " << t.type << " | "
                      << t.symbol << " | Shares: " << t.shares
                      << " | Price: $" << t.price
                      << " | Total: $" << t.total << '\n';
        if (portfolio.History().empty()) std::cout << "No transactions yet.\n";
    }
}

int main() {
    std::ifstream savedFile(kDataFile, std::ios::binary);
    if (savedFile.good()) {
        savedFile.close();
        if (portfolio.Load(kDataFile)) {
            std::cout << "Saved portfolio loaded from " << kDataFile << ".\n";
        } else {
            persistenceEnabled = false;
            std::cout << "WARNING: Saved portfolio is invalid; saving is disabled to preserve the existing file.\n";
        }
    } else {
        std::cout << "No saved portfolio found; starting with default cash.\n";
    }

    for (;;) {
        std::cout << "\n========== TOWERFLOW ==========\n"
                  << "1. View portfolio\n"
                  << "2. Buy asset\n"
                  << "3. Sell asset\n"
                  << "4. Deposit cash\n"
                  << "5. Update holding price\n"
                  << "6. Transaction history\n"
                  << "0. Exit\n"
                  << "Select: ";

        int choice;
        if (!(std::cin >> choice)) break;

        if (choice == 0) { SavePortfolio(); return 0; }
        if (choice == 1) {
            ShowPortfolio();
        } else if (choice == 2) {
            Asset a;
            double shares;
            std::cout << "Symbol: "; std::cin >> a.symbol;
            std::cout << "Asset name (use underscores): "; std::cin >> a.name;
            if (!ReadNumber("Price per share: $", a.price) ||
                !ReadNumber("Shares to buy: ", shares)) continue;
            if (portfolio.Buy(a, shares)) {
                std::cout << "BUY EXECUTED.\n";
                SavePortfolio();
            } else {
                std::cout << "BUY REJECTED: check price, shares, or available cash.\n";
            }
        } else if (choice == 3) {
            std::string symbol;
            double shares;
            std::cout << "Symbol: "; std::cin >> symbol;
            if (!ReadNumber("Shares to sell: ", shares)) continue;
            if (portfolio.Sell(symbol, shares)) {
                std::cout << "SELL EXECUTED.\n";
                SavePortfolio();
            } else {
                std::cout << "SELL REJECTED: holding or share quantity invalid.\n";
            }
        } else if (choice == 4) {
            double amount;
            if (ReadNumber("Deposit amount: $", amount)) {
                if (portfolio.Deposit(amount)) {
                    std::cout << "DEPOSIT EXECUTED.\n";
                    SavePortfolio();
                } else {
                    std::cout << "Deposit must be positive.\n";
                }
            }
        } else if (choice == 5) {
            std::string symbol;
            double price;
            std::cout << "Symbol: "; std::cin >> symbol;
            if (ReadNumber("New price: $", price)) {
                if (portfolio.UpdatePrice(symbol, price)) {
                    std::cout << "PRICE UPDATED.\n";
                    SavePortfolio();
                } else {
                    std::cout << "Price update rejected.\n";
                }
            }
        } else if (choice == 6) {
            ShowHistory();
        } else {
            std::cout << "Unknown option.\n";
        }
    }
    SavePortfolio();
    return 0;
}
