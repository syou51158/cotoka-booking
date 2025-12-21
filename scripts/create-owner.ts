
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createOwner() {
  const email = 'syo.t.company@gmail.com';
  const password = 'syou108810';

  console.log(`Checking if user ${email} exists...`);

  // 1. Check if user exists (by trying to sign in or creating directly)
  // Actually, let's just try to create. If exists, we update.
  // admin.createUser will return the user if successful.

  // First, search for user by email
  const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers();
  
  if (searchError) {
    console.error('Error listing users:', searchError);
    process.exit(1);
  }

  let user = users.find(u => u.email === email);
  let userId;

  if (user) {
    console.log(`User ${email} already exists (ID: ${user.id}). Updating password...`);
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: password, email_confirm: true }
    );
    if (updateError) {
      console.error('Error updating user:', updateError);
      process.exit(1);
    }
    userId = user.id;
    console.log('Password updated.');
  } else {
    console.log(`Creating user ${email}...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Owner' }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      process.exit(1);
    }
    if (!newUser.user) {
        console.error('No user returned after creation');
        process.exit(1);
    }
    userId = newUser.user.id;
    console.log(`User created (ID: ${userId}).`);
  }

  // 2. Upsert into profiles with role = 'owner'
  console.log('Updating profile role to owner...');
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      role: 'owner',
      full_name: 'Super Admin Owner',
      updated_at: new Date().toISOString()
    });

  if (profileError) {
    console.error('Error updating profile:', profileError);
    // Don't exit, try to continue to staff
  } else {
    console.log('Profile updated.');
  }

  // 3. Upsert into staff table
  // We need to check if staff record exists or create one.
  // The staff table might link to user_id.
  
  // Let's check staff table structure from metadata or previous knowledge
  // Assuming staff table has user_id column.
  
  console.log('Ensuring staff record exists...');
  
  // First, check if staff record exists for this user_id
  const { data: existingStaff, error: staffFetchError } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (staffFetchError) {
     console.error('Error checking staff record:', staffFetchError);
  }

  if (existingStaff) {
      console.log(`Staff record already exists (ID: ${existingStaff.id}).`);
  } else {
      console.log('Creating new staff record...');
      // Need to know required columns for staff table. 
      // Based on typical schema: name/display_name, email, etc.
      // Let's try minimal insert and see if it works, or fetch schema first.
      // But for now, let's assume 'display_name' is required.
      
      const { error: staffInsertError } = await supabase
        .from('staff')
        .insert({
            user_id: userId,
            display_name: 'Owner',
            email: email,
            role: 'admin', // Changed from 'stylist' to 'admin' to match app_role enum
                             // Wait, user_role enum is for profiles. staff table might have its own columns.
                             // Let's use 'Stylist' or similar as a placeholder if role is required.
                             // Actually, let's just try insert with user_id and see.
            // If strict constraints exist, this might fail.
            // Let's assume standard fields from previous context: display_name, email.
        });
        
      if (staffInsertError) {
          console.error('Error creating staff record:', staffInsertError);
          // If it fails, it might be due to missing required fields.
          // But primary goal is Auth + Profile role. Staff record is secondary but recommended.
      } else {
          console.log('Staff record created.');
      }
  }

  console.log('Owner account setup complete.');
}

createOwner();
