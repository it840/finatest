insert into public.categories (name) values
('💻 IT / Electronics'),('🖨️ Office Equipment'),('🪑 Furniture'),('🍳 Kitchen Equipment'),
('🔌 Appliances'),('🛠️ Tools / Maintenance'),('🚗 Vehicles / Transportation'),('🧹 Housekeeping'),
('🦺 Safety Equipment'),('🛏️ Linen / Textile'),('📱 Communication Equipment'),('📺 Audio / Visual'),
('🏓 Sports / Recreation'),('📦 Others')
on conflict (name) do nothing;

insert into public.sub_categories (category_id, name)
select c.id, s.name from (values
 ('💻 IT / Electronics','Laptop'),('💻 IT / Electronics','Desktop'),('💻 IT / Electronics','Monitor'),
 ('💻 IT / Electronics','Printer'),('💻 IT / Electronics','Network Equipment'),
 ('🖨️ Office Equipment','Photocopier'),('🖨️ Office Equipment','Scanner'),('🖨️ Office Equipment','Shredder'),
 ('🖨️ Office Equipment','Calculator'),('🖨️ Office Equipment','Filing Equipment'),
 ('🪑 Furniture','Office Chair'),('🪑 Furniture','Desk'),('🪑 Furniture','Cabinet'),('🪑 Furniture','Bed'),('🪑 Furniture','Sofa'),
 ('🍳 Kitchen Equipment','Freezer'),('🍳 Kitchen Equipment','Rice Cooker'),('🍳 Kitchen Equipment','Oven'),('🍳 Kitchen Equipment','Blender'),('🍳 Kitchen Equipment','Refrigerator'),
 ('🔌 Appliances','Refrigerator'),('🔌 Appliances','Air Conditioner'),('🔌 Appliances','Washing Machine'),('🔌 Appliances','Television'),
 ('🛠️ Tools / Maintenance','Power Tools'),('🛠️ Tools / Maintenance','Hand Tools'),('🛠️ Tools / Maintenance','Electrical Tools'),
 ('🚗 Vehicles / Transportation','Motorcycle'),('🚗 Vehicles / Transportation','Van'),('🚗 Vehicles / Transportation','Car'),
 ('🚗 Vehicles / Transportation','Utility Vehicle'),('🚗 Vehicles / Transportation','Truck'),
 ('🧹 Housekeeping','Vacuum'),('🧹 Housekeeping','Floor Polisher'),('🧹 Housekeeping','Cleaning Machine'),
 ('🦺 Safety Equipment','Fire Extinguisher'),('🦺 Safety Equipment','First Aid Kit'),('🦺 Safety Equipment','Safety Gear'),
 ('🛏️ Linen / Textile','Bed Sheet'),('🛏️ Linen / Textile','Pillow'),('🛏️ Linen / Textile','Pillowcase'),
 ('🛏️ Linen / Textile','Towel'),('🛏️ Linen / Textile','Blanket'),('🛏️ Linen / Textile','Curtain'),
 ('📱 Communication Equipment','Mobile Phone'),('📱 Communication Equipment','Telephone'),('📱 Communication Equipment','Two-Way Radio'),
 ('📱 Communication Equipment','Intercom'),('📱 Communication Equipment','Communication System'),
 ('📺 Audio / Visual','Television'),('📺 Audio / Visual','Speaker'),('📺 Audio / Visual','Projector'),('📺 Audio / Visual','Microphone'),
 ('🏓 Sports / Recreation','Table Tennis Equipment'),('🏓 Sports / Recreation','Billiard Equipment'),('🏓 Sports / Recreation','Fitness Equipment'),
 ('🏓 Sports / Recreation','Swimming Equipment'),('🏓 Sports / Recreation','Outdoor Games'),('🏓 Sports / Recreation','Recreation Equipment'),
 ('📦 Others','Miscellaneous Equipment')
) as s(cat,name)
join public.categories c on c.name = s.cat
on conflict do nothing;

insert into public.locations (name) values
('Warehouse'),('Main Kitchen'),('Front Office'),('PAV 1'),('PAV 2'),('Staff House'),
('Executive Office'),('Motor Pool A'),('Motor Pool B')
on conflict (name) do nothing;

insert into public.departments (name) values
('Procurement'),('Housekepping'),('F&B-Kitchen'),('F&B-Services'),('Grounds'),
('Maintenance'),('Executive'),('Construction'),('Accounting')
on conflict (name) do nothing;

insert into public.statuses (name) values
('Active'),('In Use'),('Available'),('Under Maintenance'),('Missing'),('Damaged'),('Retired'),('Disposed')
on conflict (name) do nothing;

insert into public.conditions (name) values
('Excellent'),('Good'),('Fair'),('Poor'),('Damaged'),('For Repair')
on conflict (name) do nothing;

insert into public.acquisition_types (name) values
('Purchase'),('Donation'),('Transfer'),('Lease'),('Company-Issued'),('Gift'),('Replacement'),('Other')
on conflict (name) do nothing;

insert into public.disposal_reasons (name, meaning) values
('Damaged Beyond Repair','Asset cannot reasonably be repaired'),
('Obsolete','No longer suitable for current use'),
('End of Useful Life','Useful life has ended'),
('Non-Functional','No longer working'),
('Uneconomical to Repair','Repair cost is too high'),
('Lost','Asset cannot be located'),
('Stolen','Asset was stolen'),
('Sold','Asset was sold'),
('Donated','Asset was donated'),
('Replaced','Replaced by a newer asset'),
('Excess / No Longer Needed','No longer required'),
('Transferred','Removed from this location/entity'),
('Other','Other reason')
on conflict (name) do nothing;

insert into public.movement_types (name) values
('Tranfer'),('Relocation'),('Assignment'),('Return'),('Repair'),('Disposal'),('Other')
on conflict (name) do nothing;

insert into public.movement_reasons (name) values
('Transfer to Another Department'),('Transfer to Another Location'),('Employee Assignment'),
('Employee Reassignment'),('Temporary Transfer'),('For Repair'),('For Maintenance'),
('For Inspection'),('For Calibration'),('Returned from Repair'),('Returned from Maintenance'),
('Replacement'),('New Assignment'),('Project Use'),('Event / Activity Use'),('Storage'),('Disposal'),('Other')
on conflict (name) do nothing;
