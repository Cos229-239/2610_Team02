#include <iostream>
#include <string>
#include <vector>
#include "Part.cpp"
#include "Menu.cpp"
#include "PartActions.cpp"
#include "InputCheck.cpp"
#include "MenuEnums.cpp"


//TowerFlow is going to be a shell of an inventory to grow
// on that is planned to be a software as a service (SaaS) for the management of inventory and sales for small businesses.
// The goal is to provide a simple and intuitive interface for users to manage their products, track sales, and generate reports.


int main() {

	bool PowerOn = true;
	int UserInput;

	while (PowerOn) {
		Intro();
		Input(UserInput);

		switch (UserInput) {
		case(TOTAL_STOCK):
			TotalStockCount();
			break;
		case(CREATE_PART):
			CreatePart();
			break;
		case(LIST_PART):
			ListParts();
			break;
		case(EDIT_PART):
			EditPart();
			break;
		case(DELETE_PART):
			DeletePart();
			break;

		case(QUIT): // enter 16 to quit, currently on the enum list
			PowerOn = false;
			break;

		default:
			std::cout << "Invalid selection. Please try again." << std::endl;
			break;

		}
	}
	return 0;
}