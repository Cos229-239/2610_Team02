namespace TowerFlowWinForm
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
            PartData.LoadParts();
            RefreshGrid();
        }

        private void RefreshGrid()
        {
            var parts = PartData.GetAllParts();
            partsGrid.Rows.Clear();
            if (partsGrid.Columns.Count == 0)
            {
                partsGrid.Columns.Add("Name", "Name");
                partsGrid.Columns.Add("Revision", "Revision");
                partsGrid.Columns.Add("PartNumber", "Part Number");
                partsGrid.Columns.Add("SerialNumber", "Serial Number");
                partsGrid.Columns.Add("Quantity", "Quantity");
            }

            foreach (var part in parts)
            {
                partsGrid.Rows.Add(part.Name, part.Revision, part.PartNumber, part.SerialNumber, part.Quantity);
            }

            lblTotalStock.Text = $"Total Stock: {PartData.GetTotalStock()}";
        }

        private void btnListParts_Click(object sender, EventArgs e)
        {
            RefreshGrid();
        }

        private void btnTotalStock_Click(object sender, EventArgs e)
        {
            RefreshGrid();
        }

        private void btnCreatePart_Click(object sender, EventArgs e)
        {
            if (int.TryParse(txtRevision.Text, out int revision) &&
               int.TryParse(txtPartNumber.Text, out int partNumber) &&
               int.TryParse(txtSerialNumber.Text, out int serialNumber) &&
               int.TryParse(txtQuantity.Text, out int quantity))
            {
                var newPart = new Part
                {
                    Name = txtName.Text,
                    Revision = revision,
                    PartNumber = partNumber,
                    SerialNumber = serialNumber,
                    Quantity = quantity
                };
                if (PartData.AddPart(newPart))
                {
                    MessageBox.Show("Part added successfully.");
                    RefreshGrid();
                }
                else
                {
                    MessageBox.Show("Failed to add part.");
                }
            }
            else
            {
                MessageBox.Show("Please enter valid numeric values for Revision, Part Number, Serial Number, and Quantity.");
            }

        }

        private void btnEditPart_Click(object sender, EventArgs e)
        {
            if (int.TryParse(txtPartNumber.Text, out int partNumber) &&
                int.TryParse(txtSerialNumber.Text, out int serialNumber) &&
                int.TryParse(txtRevision.Text, out int revision) &&
                int.TryParse(txtQuantity.Text, out int quantity))
            {
                var updatedPart = new Part
                {
                    Name = txtName.Text,
                    Revision = revision,
                    PartNumber = partNumber,
                    SerialNumber = serialNumber,
                    Quantity = quantity
                };
                if (PartData.EditPart(partNumber, serialNumber, updatedPart))
                {
                    MessageBox.Show("Part updated successfully.");
                    RefreshGrid();
                }
                else
                {
                    MessageBox.Show("Failed to update part. Make sure the part exists.");
                }
            }
            else
            {
                MessageBox.Show("Please enter valid numeric values for Revision, Part Number, Serial Number, and Quantity.");
            }

        }

        private void btnDeletePart_Click(object sender, EventArgs e)
        {
            if (!int.TryParse(txtPartNumber.Text, out int partNumber) ||
                !int.TryParse(txtSerialNumber.Text, out int serialNumber))
            {
                MessageBox.Show("Please enter valid Part Number and Serial Number.");
                return;
            }

            bool success = PartData.DeletePart(partNumber, serialNumber);
            if (!success)
            {
                MessageBox.Show("Failed to delete part. Make sure the part exists.");
            }
            else
            {
                MessageBox.Show("Part deleted successfully.");
                RefreshGrid();
            }

        }

        private void refreshTimer_Tick(object sender, EventArgs e)
        {
            PartData.LoadParts();
            RefreshGrid();
        }
    }
}
