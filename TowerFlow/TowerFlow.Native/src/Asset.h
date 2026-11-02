#pragma once
#include <string>

struct Asset {
    std::string symbol;
    std::string name;
    double price = 0.0;

    double Value(double shares) const {
        return price * shares;
    }
};
