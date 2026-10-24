#include <iostream>
#include <string>
#include <vector>
#include "Part (Malik version).cpp"
#include "Menu (Malik version).cpp"
#include "PartActions (Malik version).cpp"
#include "InputCheck (Malik version).cpp"
#include "MenuEnums (Malik version).cpp"
#include "BulkConsole.h"
#include "OperationsConsole.h"


//TowerFlow is going to be a shell of an inventory to grow
// on that is planned to be a software as a service (SaaS) for the management of inventory and sales for small businesses.
// The goal is to provide a simple and intuitive interface for users to manage their products, track sales, and generate reports.


int main() {

	bool PowerOn = true;
	int UserInput = 0;
	towerflow::BulkInventory BulkItems(Parts);
	towerflow::BulkConsole BulkMenu(BulkItems, std::cin, std::cout);
    towerflow::OperationsInventory Operations(Parts);
    towerflow::OperationsConsole OperationsMenu(Operations, std::cin, std::cout);

	while (PowerOn) {
		Intro();
		Input(UserInput);
		if (!std::cin) break;

		switch (UserInput) {
		case(TOTAL_STOCK):
			Wipe();
			TotalStockCount();
			break;

		case(CREATE_PART):
			Wipe();
			CreatePart();
			break;

		case(LIST_PART):
			Wipe();			
			ListParts();
			break;

		case(EDIT_PART):
			Wipe();
			EditPart();
			break;

		case(DELETE_PART):
			Wipe();
			DeletePart();
			break;
		
		// MODIFIED BY MALIK BROWN: Added options 6, 7, 8, 9, for Bulk Inventory Management | START //
		case(CREATE_BULK):
			Wipe();
			BulkMenu.create();
			break;

		case(LIST_BULK):
			Wipe();
			BulkMenu.list();
			break;

		case(EDIT_BULK):
			Wipe();
			BulkMenu.edit();
			break;

		case(DELETE_BULK):
			Wipe();
			BulkMenu.remove();
			break;
		// MODIFIED BY MALIK BROWN: Added options 6, 7, 8, 9, for Bulk Inventory Management | END //

        // MODIFIED BY MALIK BROWN: Connected work order, purchase, and sale options 10-15 | START //
        case(CREATE_WORK_ORDER):
            Wipe();
            OperationsMenu.createWorkOrder();
            break;
        case(EDIT_WORK_ORDER):
            Wipe();
            OperationsMenu.editWorkOrder();
            break;
        case(DELETE_WORK_ORDER):
            Wipe();
            OperationsMenu.deleteWorkOrder();
            break;
        case(PURCHASE_PART):
            Wipe();
            OperationsMenu.purchasePart();
            break;
        case(PURCHASE_ORDER):
            Wipe();
            OperationsMenu.purchaseOrder();
            break;
        case(CREATE_SALE):
            Wipe();
            OperationsMenu.createSale();
            break;
        // MODIFIED BY MALIK BROWN: Connected work order, purchase, and sale options 10-15 | END //
		case(QUIT): // enter 16 to quit, currently on the enum list
			PowerOn = false;
			break;

		default:
			Wipe();
			std::cout << "Invalid selection. Please try again." << std::endl;
			break;

		}
	}
	return 0;
}



