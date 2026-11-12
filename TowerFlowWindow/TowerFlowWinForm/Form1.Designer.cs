namespace TowerFlowWinForm
{
    partial class Form1
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            Part_ManagementBox = new GroupBox();
            btnDeletePart = new Button();
            btnEditPart = new Button();
            btnListParts = new Button();
            btnCreatePart = new Button();
            groupBox2 = new GroupBox();
            btnTotalStock = new Button();
            partsGrid = new DataGridView();
            lblTotalStock = new Label();
            Part_ManagementBox.SuspendLayout();
            groupBox2.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)partsGrid).BeginInit();
            SuspendLayout();
            // 
            // Part_ManagementBox
            // 
            Part_ManagementBox.Controls.Add(btnDeletePart);
            Part_ManagementBox.Controls.Add(btnEditPart);
            Part_ManagementBox.Controls.Add(btnListParts);
            Part_ManagementBox.Controls.Add(btnCreatePart);
            Part_ManagementBox.Location = new Point(12, 12);
            Part_ManagementBox.Name = "Part_ManagementBox";
            Part_ManagementBox.Size = new Size(109, 260);
            Part_ManagementBox.TabIndex = 0;
            Part_ManagementBox.TabStop = false;
            Part_ManagementBox.Text = "Part_Management";
            // 
            // btnDeletePart
            // 
            btnDeletePart.Location = new Point(13, 122);
            btnDeletePart.Name = "btnDeletePart";
            btnDeletePart.Size = new Size(75, 23);
            btnDeletePart.TabIndex = 3;
            btnDeletePart.Text = "Delete_Part";
            btnDeletePart.UseVisualStyleBackColor = true;
            // 
            // btnEditPart
            // 
            btnEditPart.Location = new Point(13, 93);
            btnEditPart.Name = "btnEditPart";
            btnEditPart.Size = new Size(75, 23);
            btnEditPart.TabIndex = 2;
            btnEditPart.Text = "EditPart";
            btnEditPart.UseVisualStyleBackColor = true;
            // 
            // btnListParts
            // 
            btnListParts.Location = new Point(13, 64);
            btnListParts.Name = "btnListParts";
            btnListParts.Size = new Size(75, 23);
            btnListParts.TabIndex = 1;
            btnListParts.Text = "ListPart";
            btnListParts.UseVisualStyleBackColor = true;
            // 
            // btnCreatePart
            // 
            btnCreatePart.Location = new Point(13, 35);
            btnCreatePart.Name = "btnCreatePart";
            btnCreatePart.Size = new Size(75, 23);
            btnCreatePart.TabIndex = 0;
            btnCreatePart.Text = "CreatePart";
            btnCreatePart.UseVisualStyleBackColor = true;
            // 
            // groupBox2
            // 
            groupBox2.Controls.Add(btnTotalStock);
            groupBox2.Location = new Point(152, 12);
            groupBox2.Name = "groupBox2";
            groupBox2.Size = new Size(145, 166);
            groupBox2.TabIndex = 1;
            groupBox2.TabStop = false;
            groupBox2.Text = "Inventory";
            // 
            // btnTotalStock
            // 
            btnTotalStock.Location = new Point(6, 35);
            btnTotalStock.Name = "btnTotalStock";
            btnTotalStock.Size = new Size(75, 23);
            btnTotalStock.TabIndex = 0;
            btnTotalStock.Text = "TotalStock";
            btnTotalStock.UseVisualStyleBackColor = true;
            // 
            // partsGrid
            // 
            partsGrid.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            partsGrid.Location = new Point(453, 32);
            partsGrid.Name = "partsGrid";
            partsGrid.Size = new Size(335, 359);
            partsGrid.TabIndex = 2;
            // 
            // lblTotalStock
            // 
            lblTotalStock.AutoSize = true;
            lblTotalStock.Font = new Font("Segoe UI", 12F);
            lblTotalStock.Location = new Point(583, 9);
            lblTotalStock.Name = "lblTotalStock";
            lblTotalStock.Size = new Size(91, 21);
            lblTotalStock.TabIndex = 3;
            lblTotalStock.Text = "TotalStock:0";
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(800, 450);
            Controls.Add(lblTotalStock);
            Controls.Add(partsGrid);
            Controls.Add(groupBox2);
            Controls.Add(Part_ManagementBox);
            Name = "Form1";
            Text = "Form1";
            Part_ManagementBox.ResumeLayout(false);
            groupBox2.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)partsGrid).EndInit();
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private GroupBox Part_ManagementBox;
        private Button btnCreatePart;
        private Button btnDeletePart;
        private Button btnEditPart;
        private Button btnListParts;
        private GroupBox groupBox2;
        private Button btnTotalStock;
        private DataGridView partsGrid;
        private Label lblTotalStock;
    }
}
