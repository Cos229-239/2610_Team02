#pragma once
#include <iostream>
#include <limits>
#include <string>


int getValidatedIntegerInput(const std::string& prompt) {
	int value;
	while (true) {
		std::cout << prompt;
		if (std::cin >> value) {

		std:cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
			return value;
		}
		else {
			std::cout << "Invaild input. Please enter a vaild number: ";
			std::cin.clear();
			std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');

		}
	}
}

