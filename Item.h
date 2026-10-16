#ifdef ITEM_H
#define ITEM_H

#include <string>
#include <iostream>
#include <iomanip>


struct Item {
	std::string itemID;
	std::string name;
	std::string category;
	int quantity;
	double unitPrice;
	int reorderPoint;

	Item()
		: itemID(""), name(""), category(""), quantity(0), unitPrice(0.0), reorderPoint(5) {
	}

	Item(std::string id, std::string n, std::string cat, int qty, double price, int reorder)
		: itemID(id), name(n), category(cat), quantity(qty), unitPrice(price), reorderPoint(reorder) {
	}

	bool needsReorder() const {
		return quantity <= reorderPoint;
	}

	void printItemDetails() const {
		std::cout << "[" << itemID << "] " << name
			<< " | Category: " << category
			<< " | Quantity: " << quantity
			<< " | Unit Price: $" << std::fixed << std::setprecision(2) << unitPrice
			if (needsReorder()) {
				std::cout << "[LOW STOCK WARNING]";
			}
		std::cout << std::endl;
	}
};

#endif