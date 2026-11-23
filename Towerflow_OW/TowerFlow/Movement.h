#pragma once
#include <cstdint>
#include <string>

enum class MovementType {
    Receive = 0,
    Remove = 1,
    Transfer = 2,
    Purchase = 3,
    Sale = 4
};

struct Movement {
    MovementType type;
    int productId;
    int quantity;
    std::string from;
    std::string to;
    std::int64_t recordedAt;
    std::int64_t unitPriceCents;
    std::string business;
    std::string reference;

    bool isTrade() const {
        return type == MovementType::Purchase || type == MovementType::Sale;
    }
};

inline const char* movementName(MovementType type) {
    switch (type) {
    case MovementType::Receive: return "Receive";
    case MovementType::Remove: return "Remove";
    case MovementType::Transfer: return "Transfer";
    case MovementType::Purchase: return "Purchase";
    case MovementType::Sale: return "Sale";
    }
    return "Unknown";
}
