#pragma once
#include "MenuEnums (Malik version).cpp"
#include "OptionInput.h"
#include <iostream>
#include <sstream>
#include <string>

// MODIFIED BY MALIK BROWN: Modified InputCheck to validate user input for integers. Updated input validation to reject non-integer values. | START // 
static bool TryParseInt(const std::string& line, int& value) {
    std::istringstream parser(line);
    int number = 0;
    char extra = '\0';
    if (!(parser >> number) || (parser >> extra)) return false;
    value = number;
    return true;
}

bool GetValidatedInt(int& UserInput) {
    std::string line;
    while (towerflow::ReadOptionLine(std::cin, line)) {
        if (TryParseInt(line, UserInput)) return true;
        std::cout << "Invalid input. Please enter a valid integer: ";
    }
    return false;
}

bool Input(int& UserInput) {
    std::string line;
    // Keep the prompt in the loop so every retry uses the same wording.
    while (true) {
        std::cout << "Please enter your selection (1-16): ";
        if (!std::getline(std::cin, line)) return false;
        int selection = 0;
        if (TryParseInt(line, selection) && selection >= TOTAL_STOCK && selection <= QUIT) {
            UserInput = selection;
            return true;
        }
        std::cout << "Please choose a number from 1 to 16.\n";
    }
}
// MODIFIED BY MALIK BROWN: Modified InputCheck to validate user input for integers. Updated input validation to reject non-integer values. | END //