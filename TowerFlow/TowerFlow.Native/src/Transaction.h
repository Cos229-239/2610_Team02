#pragma once
#include <string>

struct Transaction {
    std::string type;
    std::string symbol;
    double shares = 0.0;
    double price = 0.0;
    double total = 0.0;
    std::string timestamp;
};
