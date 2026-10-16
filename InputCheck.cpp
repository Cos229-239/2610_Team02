#pragma once
#include <iostream>
#include <limits>

void GetValidatedInt(int& UserInput) {
    while (true) {
        std::cin >> UserInput;
        if (std::cin.fail()) {
            std::cin.clear(); // Clear the error flag
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Discard invalid input
            std::cout << "Invalid input. Please enter a valid integer: ";
        } else {
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Discard any extra input
            break; // Valid input received, exit the loop
        }
    }
}

void Input(int& UserInput) {
    GetValidatedInt(UserInput);
}