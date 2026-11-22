#pragma once
#include <string>

namespace towerflow {

inline bool IsPartId(const std::string& value) {
    return !value.empty() &&
        value.find_first_not_of("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
            == std::string::npos;
}

// A serial is an identifier, so store digits as text rather than doing arithmetic.
inline bool IsSerialNumber(const std::string& value) {
    return !value.empty() && value.size() <= 20 &&
        value.find_first_not_of("0123456789") == std::string::npos;
}

} // namespace towerflow
