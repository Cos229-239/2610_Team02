namespace TowerFlowWinForm
{
    public partial class TowerFlow_NamePanel : Form
    {
        private string filter = "";
        public TowerFlow_NamePanel()
        {
            InitializeComponent();
            PartData.LoadParts();
            RefreshGrid();
        }

        private void ClearInputs()
        {
            txtName.Clear();
            txtRevision.Clear();
            txtPartNumber.Clear();
            txtSerialNumber.Clear();
            txtQuantity.Clear();
        }

        private void RefreshGrid(string filter = "")
        {
            var parts = PartData.GetPartsByName(filter);
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

               int.TryParse(txtQuantity.Text, out int quantity))
            {
                int serialNumber = PartUtils.GenRandomSerialNumber(); // generates a unique serial number per new part
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
                    ClearInputs();
                }
                else
                {
                    MessageBox.Show("Failed to add part.");
                }
            }
            else
            {
                MessageBox.Show("Please enter valid numeric values for Revision, Part Number, and Quantity.");
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
                MessageBox.Show("Please enter valid numeric values for Part Number and Serial Number.");
                return;
            }
            // ClearInputs();
            bool success = PartData.DeletePart(partNumber, serialNumber);
            if (!success)
            {
                MessageBox.Show("Failed to delete part. Make sure the part exists.");
            }
            else
            {
                MessageBox.Show("Part deleted successfully.");
                RefreshGrid();
                ClearInputs();
            }

        }

        // private void refreshTimer_Tick(object sender, EventArgs e)
        //{
        //  PartData.LoadParts();
        //RefreshGrid();
        //}

        private void btnSearch_Click(object sender, EventArgs e)
        {
            RefreshGrid(txtSearchBar.Text);
        }

        private void btnQuit_Click(object sender, EventArgs e)
        {
            bool confirmQuit = MessageBox.Show("Are you sure you want to quit?", "Confirm Quit", MessageBoxButtons.YesNo) == DialogResult.Yes;

            if (confirmQuit)
            {
                Application.Exit();
            }
        }
    }
}
