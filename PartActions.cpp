
#include "Part.cpp"
#include "InputCheck.cpp"
#include <iostream>
#include <vector>

static std::vector<Part> Parts;

void CreatePart() {
	Part NewPart;
	std::cout << "Enter Part Name: ";
	std::cin >> NewPart.Name;
	std::cout << "Enter Part Number: ";
	GetValidatedInt(NewPart.PartNumber);
	std::cout << "Enter Serial Number: ";
	GetValidatedInt(NewPart.SerialNumber);
	std::cout << "Enter Quantity: ";
	GetValidatedInt(NewPart.Quantity);
	Parts.push_back(NewPart);

	std::cout << "Part created successfully!" << std::endl;
	std::cout << "Part Name: " << NewPart.Name << std::endl;
	std::cout << "Part Number: " << NewPart.PartNumber << std::endl;
	std::cout << "Serial Number: " << NewPart.SerialNumber << std::endl;
	std::cout << "Quantity: " << NewPart.Quantity << std::endl;
	std::cin.get(); // Wait for user input before returning to the menu

	// Here you would typically add the new part to a collection of parts
	// For example, you could have a vector<Part> to store all parts
	// parts.push_back(NewPart);
}

void TotalStockCount() {
	int Total = 0;
	for (const Part& part : Parts) {
		Total += part.Quantity;
	}
	std::cout << "Total Stock: " << Total << std::endl;
}

void ListParts() {
	if (Parts.empty()) {
		std::cout << "No parts available." << std::endl;
		return;
	}
	for (const auto& part : Parts) {
		std::cout << "Part Name: " << part.Name << std::endl;
		std::cout << "Part Number: " << part.PartNumber << std::endl;
		std::cout << "Serial Number: " << part.SerialNumber << std::endl;
		std::cout << "Quantity: " << part.Quantity << std::endl;
	}
}

void EditPart() {
	if (Parts.empty()) {
		std::cout << "No parts available to edit." << std::endl;
		return;
	}

	ListParts();
	std::cout << "Enter the Part Number of the part you want to edit: ";
	int PartNumber;
	GetValidatedInt(PartNumber);

	if (PartNumber < 1 || PartNumber >(int)Parts.size()) {
		std::cout << "Invalid Part Number." << std::endl;
		return;
	}

	Part& TargetPart = Parts[PartNumber - 1];
	std::cout << "Editing Part Name: (current: " << TargetPart.Name << ")" << std::endl;
	std::cin >> TargetPart.Name;
	std::cout << "Editing Part Number (current: " << TargetPart.PartNumber << "): ";
	GetValidatedInt(TargetPart.PartNumber);
	std::cout << "Editing Serial Number (current: " << TargetPart.SerialNumber << "): ";
	GetValidatedInt(TargetPart.SerialNumber);
	std::cout << "Editing Quantity (current: " << TargetPart.Quantity << "): ";
	GetValidatedInt(TargetPart.Quantity);

	std::cout << "Part updated successfully!" << std::endl;
}

void DeletePart() {
	if (Parts.empty()) {
		std::cout << "No parts available to delete." << std::endl;
		return;
	}
	ListParts();
	std::cout << "Enter the Part Number of the part you want to delete: ";
	int PartNumber;
	GetValidatedInt(PartNumber);
	if (PartNumber < 1 || PartNumber >(int)Parts.size()) {
		std::cout << "Invalid Part Number." << std::endl;
		return;
	}
	Parts.erase(Parts.begin() + (PartNumber - 1));
	std::cout << "Part deleted successfully!" << std::endl;
}