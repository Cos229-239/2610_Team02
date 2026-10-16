#include <iostream>



void Divider() {
	std::cout << "----------------------------------------" << std::endl;
}

void Intro() {
	std::cout << "Welcome to TowerFlow, the ultimate inventory management system for small businesses!" << std::endl;
	std::cout << "Please select an option from the menu below:" << std::endl;
	Divider();
	std::cout << "1. Total Stock" << std::endl;
	Divider();
	std::cout << "2. Create Part" << std::endl;
	Divider();
	std::cout << "3. List Part" << std::endl;
	Divider();
	std::cout << "4. Edit Part" << std::endl;
	Divider();
	std::cout << "5. Delete Part" << std::endl;
	Divider();
	std::cout << "6. Create Bulk" << std::endl;
	Divider();
	std::cout << "7. List Bulk" << std::endl;
	Divider();
}