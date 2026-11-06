#include <iostream>
#include "InputCheck.cpp"
#include <vector>
#include "Part.cpp"
#include "Menu.cpp"
#include <fstream>
#include <sstream>

static std::vector<Part> Parts;

const std::string PartsFile = "parts.txt";

void SaveParts() {
	std::ofstream OutFile(PartsFile);
	if (!OutFile) {
		std::cout << "Error opening file for saving parts." << std::endl;
		return;
	}
	for (const Part& part : Parts) {
		OutFile << part.Name << "," << part.Revision << "," << part.PartNumber << "," << part.SerialNumber << "," << part.Quantity << '\n';
	}
}

void LoadParts() {
	std::ifstream InFile(PartsFile);
	if (!InFile) {
		return; // No file yet (first run): start with an empty list
	}
	Parts.clear();
	std::string Line;
	while (std::getline(InFile, Line)) {
		std::istringstream Iss(Line);
		Part part;
		char Comma;
		if (std::getline(Iss, part.Name, ',') &&
			(Iss >> part.Revision >> Comma) &&
			(Iss >> part.PartNumber >> Comma) &&
			(Iss >> part.SerialNumber >> Comma) &&
			(Iss >> part.Quantity)) {
			Parts.push_back(part);
		}
	}
}

void CreatePart() {
	Part NewPart;
	std::cout << "Enter Part Name: ";
	std::getline(std::cin, NewPart.Name); // Get the full line for the part name, including spaces
	std::cout << "Enter ID#: ";
	GetValidatedInt(NewPart.Revision);
	std::cout << "Enter Part Number: ";
	GetValidatedInt(NewPart.PartNumber);
	std::cout << "Enter Serial Number: ";
	GetValidatedInt(NewPart.SerialNumber);
	std::cout << "Enter Quantity: ";
	GetValidatedInt(NewPart.Quantity);
	Parts.push_back(NewPart);
	
	std::cout << "Part created successfully!" << std::endl;
	std::cout << "Part Name: " << NewPart.Name << std::endl;
	std::cout << "Revision#: " << NewPart.Revision << std::endl;
	std::cout << "Part Number: " << NewPart.PartNumber << std::endl;
	std::cout << "Serial Number: " << NewPart.SerialNumber << std::endl;
	std::cout << "Quantity: " << NewPart.Quantity << std::endl;

	for (const Part& part : Parts) {

	}


	std::cin.get(); // Wait for user input before going back to Menu
	SaveParts(); // Save the parts to the file after creating a new part
	
	// Here you would typically add the new part to a collection of parts
	// For example, you could have a vector<Part> to store all parts
	// parts.push_back(NewPart);
}

void TotalStockCount() {
	if (Parts.empty()) {
		std::cout << " No Parts in stock." << std::endl;
		std::cin.get(); 
		return;
	}
	
	int Total = 0;
	for (const Part& part : Parts) {
		std::cout << part.Name << " - Quantity: " << part.Quantity << std::endl;
		Total += part.Quantity;
		Divider();
		
	}
	std::cout << "Total Stock: " << Total << std::endl;
	
	std::cin.get(); // Waits for user input before going back to Menu
}


void ListParts() {
	if (Parts.empty()) {
		std::cout << "No parts available." << std::endl;
		return;
	}
	for (const auto& part : Parts) {
		std::cout << "Part Name: " << part.Name << std::endl;
		std::cout << "ID# " << part.Revision << std::endl;
		std::cout << "Part Number: " << part.PartNumber << std::endl;
		std::cout << "Serial Number: " << part.SerialNumber << std::endl;
		std::cout << "Quantity: " << part.Quantity << std::endl;
	}
	std::cin.get(); // Wait for user input before going back to Menu
}

// Returns the index of the first part with this PartNumber, or -1 (not found)
int FindPartIndex(int PartNumber) {
	for (int i = 0; i < (int)Parts.size(); i++) {
		if (Parts[i].PartNumber == PartNumber) { //Makes the search truly by part number inputted by user instead of relaying for loop cycles of new parts made
			return i;

			//Parts[i] will match the data of PartNumber to use
		}
	}
	return -1;
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
	
	int Index = FindPartIndex(PartNumber);
	if (Index < 0) {
		std::cout << "No part found with that Part Number." << std::endl;
		return;
	}

	Part& TargetPart = Parts[Index];
	std::cout << "Editing Part Name: (current: " << TargetPart.Name << ")" << std::endl;
	std::getline(std::cin, TargetPart.Name);
	std::cout << "Editing Revision (current: " << TargetPart.Revision << "): ";
	GetValidatedInt(TargetPart.Revision);
	std::cout << "Editing Part Number (current: " << TargetPart.PartNumber << "): ";
	GetValidatedInt(TargetPart.PartNumber);
	std::cout << "Editing Serial Number (current: " << TargetPart.SerialNumber << "): ";
	GetValidatedInt(TargetPart.SerialNumber);
	std::cout << "Editing Quantity (current: " << TargetPart.Quantity << "): ";
	GetValidatedInt(TargetPart.Quantity);
	
	std::cout << "Part updated successfully!" << std::endl;
	SaveParts(); // Save the parts to the file after editing a part
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
	int Index = FindPartIndex(PartNumber);
	if (Index < 0) {
		std::cout << "No part found with that Part Number." << std::endl;
		return;
	}
	Parts.erase(Parts.begin() + Index);
	std::cout << "Part deleted successfully!" << std::endl;
	SaveParts(); // Save the parts to the file after deleting a part
	
}
