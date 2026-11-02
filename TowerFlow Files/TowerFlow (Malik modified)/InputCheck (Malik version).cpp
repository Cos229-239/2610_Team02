#pragma once
#include <iostream>
#include <sstream>
#include <string>

// MODIFIED BY MALIK BROWN: Modified InputCheck to validate user input for integers. Updated input validation to reject non-integer values. | START // 
bool GetValidatedInt(int& UserInput) {
    
    std::string line;
    
    while (std::getline(std::cin, line)) {
        std::istringstream parser(line);
        int number = 0;
        char extra = '\0';
        if ((parser >> number) && !(parser >> extra)) 
        {
            UserInput = number;
            return true;
        }
        std::cout << "Invalid input. Please enter a valid integer: ";
    }
    return false;
}

bool Input(int& UserInput) {
    return GetValidatedInt(UserInput);
}
// MODIFIED BY MALIK BROWN: Modified InputCheck to validate user input for integers. Updated input validation to reject non-integer values. | END //