#pragma once
#include <iostream>


void Wipe() {
	std::system("cls");
}

void Divider() {
	std::cout << "----------------------------------------" << std::endl;
}

void Intro() {
	Wipe();
	std::cout << "Welcome to TowerFlow, the ultimate inventory management system for all businesses!" << std::endl;
	std::cout << "INVENTORY MANAGEMENT" << std::endl;
	Divider();
	std::cout << "1. Total Stock" << std::endl;
	std::cout << "PART MANAGEMENT" << std::endl;
	std::cout << "2. Create Part" << std::endl;
	std::cout << "3. List Part" << std::endl;
	std::cout << "4. Edit Part" << std::endl;
	std::cout << "5. Delete Part" << std::endl;
	Divider();
	std::cout << "BULK MANAGEMENT" << std::endl;
	std::cout << "6. Create Bulk" << std::endl;
	std::cout << "7. List Bulk" << std::endl;
	std::cout << "8. Edit Bulk" << std::endl;
	std::cout << "9. Delete Bulk" << std::endl;
	Divider();
	std::cout << "WORK ORDER MANAGEMENT" << std::endl;
	std::cout << "10.Create Work Order" << std::endl;
	std::cout << "11. Edit Work Order" << std::endl;
	std::cout << "12. Delete Work Order" << std::endl;
	Divider();
	std::cout << "PURCHASING/MARKETING" << std::endl;
	std::cout << "13. Purchase Part" << std::endl;
	std::cout << "14. Purchase Order" << std::endl;
	std::cout << "15. Create Sale" << std::endl;
	Divider();
	std::cout << "16. Quit" << std::endl;
	Divider();
	std::cout << "Please enter your choice: ";
}