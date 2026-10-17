#include <iostream>
#include <string>
#include <vector>
#include "Part (Malik version).cpp"
#include "Menu (Malik version).cpp"
#include "PartActions (Malik version).cpp"
#include "InputCheck (Malik version).cpp"
#include "MenuEnums (Malik version).cpp"
#include "BulkConsole.h"


//TowerFlow is going to be a shell of an inventory to grow
// on that is planned to be a software as a service (SaaS) for the management of inventory and sales for small businesses.
// The goal is to provide a simple and intuitive interface for users to manage their products, track sales, and generate reports.


int main() {

	bool PowerOn = true;
	int UserInput = 0;
	towerflow::BulkInventory BulkItems(Parts);
	towerflow::BulkConsole BulkMenu(BulkItems, std::cin, std::cout);

	while (PowerOn) {
		Intro();
		Input(UserInput);
		if (!std::cin) break;

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
		
		// MODIFIED BY MALIK BROWN: Added options 6, 7, 8, 9, for Bulk Inventory Management | START //
		case(CREATE_BULK):
			BulkMenu.create();
			break;
		case(LIST_BULK):
			BulkMenu.list();
			break;
		case(EDIT_BULK):
			BulkMenu.edit();
			break;
		case(DELETE_BULK):
			BulkMenu.remove();
			break;
		// MODIFIED BY MALIK BROWN: Added options 6, 7, 8, 9, for Bulk Inventory Management | END //

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


