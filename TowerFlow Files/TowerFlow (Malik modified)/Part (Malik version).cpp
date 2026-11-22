#pragma once
#include <string>

// MODIFIED BY MALIK BROWN: Modified struct Part to hold part information | START //
struct Part {
    std::string Name;
    std::string PartId;
    std::string SerialNumber;
    int Quantity = 0;
};
// MODIFIED BY MALIK BROWN: Modified struct Part to hold part information | END //