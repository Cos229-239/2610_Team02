#include "Portfolio.h"
#include <chrono>
#include <ctime>
#include <iomanip>
#include <fstream>
#include <cmath>
#include <utility>
#include <sstream>

Portfolio::Portfolio(double startingCash) : cash_(startingCash < 0 ? 0 : startingCash) {}

bool Portfolio::Deposit(double amount) {
    if (amount <= 0) return false;
    cash_ += amount;
    Record("DEPOSIT", "CASH", 0, amount);
    return true;
}

bool Portfolio::Buy(const Asset& asset, double shares) {
    if (asset.symbol.empty() || asset.price <= 0 || shares <= 0) return false;
    const double total = asset.price * shares;
    if (total > cash_) return false;

    auto& position = holdings_[asset.symbol];
    position.asset = asset;
    position.CostBasis += total;
    position.shares += shares;
    cash_ -= total;
    Record("BUY", asset.symbol, shares, asset.price);
    return true;
}

bool Portfolio::Sell(const std::string& symbol, double shares) {
    auto it = holdings_.find(symbol);
    if (it == holdings_.end() || shares <= 0 || shares > it->second.shares)
        return false;

    auto& position = it->second;
    const double price = position.asset.price;
    const double averageCost = position.shares > 0
        ? position.CostBasis / position.shares : 0;
    const double proceeds = price * shares;

    position.shares -= shares;
    position.CostBasis -= averageCost * shares;
    cash_ += proceeds;
    Record("SELL", symbol, shares, price);

    if (position.shares < 0.00000001) holdings_.erase(it);
    return true;
}

bool Portfolio::UpdatePrice(const std::string& symbol, double price) {
    auto it = holdings_.find(symbol);
    if (it == holdings_.end() || price <= 0) return false;
    it->second.asset.price = price;
    return true;
}


bool Portfolio::Save(const std::string& path) const {
    std::ofstream out(path, std::ios::trunc);
    if (!out) return false;
    out << std::setprecision(17);
    out << "TOWERFLOW_PORTFOLIO_V1\n";
    out << "CASH " << cash_ << '\n';
    for (const auto& [symbol, position] : holdings_) {
        out << "POSITION " << std::quoted(symbol) << ' '
            << std::quoted(position.asset.name) << ' '
            << position.asset.price << ' ' << position.shares << ' '
            << position.CostBasis << '\n';
    }
    for (const auto& transaction : history_) {
        out << "TRANSACTION " << std::quoted(transaction.type) << ' '
            << std::quoted(transaction.symbol) << ' '
            << transaction.shares << ' ' << transaction.price << ' '
            << transaction.total << ' '
            << std::quoted(transaction.timestamp) << '\n';
    }
    out.flush();
    return static_cast<bool>(out);
}

bool Portfolio::Load(const std::string& path) {
    std::ifstream in(path);
    if (!in) return false;
    std::string marker;
    double loadedCash = 0.0;
    if (!(in >> marker) || marker != "TOWERFLOW_PORTFOLIO_V1") return false;
    if (!(in >> marker >> loadedCash) || marker != "CASH" ||
        !std::isfinite(loadedCash) || loadedCash < 0.0) return false;
    std::map<std::string, Position> loadedHoldings;
    std::vector<Transaction> loadedHistory;
    while (in >> marker) {
        if (marker == "POSITION") {
            std::string symbol, name;
            double price = 0.0, shares = 0.0, costBasis = 0.0;
            if (!(in >> std::quoted(symbol) >> std::quoted(name) >> price >> shares >> costBasis)) return false;
            if (symbol.empty() || !std::isfinite(price) || price <= 0.0 ||
                !std::isfinite(shares) || shares <= 0.0 ||
                !std::isfinite(costBasis) || costBasis < 0.0) return false;
            Position position;
            position.asset = {symbol, name, price};
            position.shares = shares;
            position.CostBasis = costBasis;
            if (!loadedHoldings.emplace(symbol, position).second) return false;
        } else if (marker == "TRANSACTION") {
            Transaction transaction;
            if (!(in >> std::quoted(transaction.type) >> std::quoted(transaction.symbol)
                     >> transaction.shares >> transaction.price >> transaction.total
                     >> std::quoted(transaction.timestamp))) return false;
            if (transaction.type.empty() || transaction.symbol.empty() ||
                !std::isfinite(transaction.shares) || transaction.shares < 0.0 ||
                !std::isfinite(transaction.price) || transaction.price < 0.0 ||
                !std::isfinite(transaction.total) || transaction.total < 0.0) return false;
            loadedHistory.push_back(transaction);
        } else {
            return false;
        }
    }
    if (!in.eof()) return false;
    cash_ = loadedCash;
    holdings_ = std::move(loadedHoldings);
    history_ = std::move(loadedHistory);
    return true;
}

double Portfolio::Cash() const { return cash_; }

double Portfolio::MarketValue() const {
    double total = 0;
    for (const auto& [symbol, p] : holdings_)
        total += p.asset.Value(p.shares);
    return total;
}

double Portfolio::InvestedCost() const {
    double total = 0;
    for (const auto& [symbol, p] : holdings_) total += p.CostBasis;
    return total;
}

double Portfolio::TotalValue() const { return cash_ + MarketValue(); }
double Portfolio::ProfitLoss() const { return MarketValue() - InvestedCost(); }

const std::map<std::string, Position>& Portfolio::Holdings() const {
    return holdings_;
}

const std::vector<Transaction>& Portfolio::History() const {
    return history_;
}

void Portfolio::Record(const std::string& type, const std::string& symbol,
                       double shares, double price) {
    const auto now = std::chrono::system_clock::to_time_t(
        std::chrono::system_clock::now());
    std::tm local{};
    localtime_s(&local, &now);
    std::ostringstream stamp;
    stamp << std::put_time(&local, "%Y-%m-%d %H:%M:%S");

    history_.push_back({type, symbol, shares, price, shares * price, stamp.str()});
}
