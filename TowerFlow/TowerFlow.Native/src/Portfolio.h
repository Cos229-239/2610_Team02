#pragma once
#include "Asset.h"
#include "Transaction.h"
#include <map>
#include <string>
#include <vector>

struct Position {
    Asset asset;
    double shares = 0.0;
    double CostBasis = 0.0;
};

class Portfolio {
public:
    explicit Portfolio(double startingCash = 10000.0);

    bool Deposit(double amount);
    bool Buy(const Asset& asset, double shares);
    bool Sell(const std::string& symbol, double shares);
    bool UpdatePrice(const std::string& symbol, double price);

    bool Save(const std::string& path) const;
    bool Load(const std::string& path);

    double Cash() const;
    double MarketValue() const;
    double InvestedCost() const;
    double TotalValue() const;
    double ProfitLoss() const;

    const std::map<std::string, Position>& Holdings() const;
    const std::vector<Transaction>& History() const;

private:
    double cash_;
    std::map<std::string, Position> holdings_;
    std::vector<Transaction> history_;

    void Record(const std::string& type, const std::string& symbol,
                double shares, double price);
};
