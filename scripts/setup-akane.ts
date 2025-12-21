
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAkane() {
  const email = 'atikosyo@gmail.com';
  const password = 'akane0123';
  const name = 'Akane';

  console.log(`Setting up user: ${email}`);

  // 1. Create Auth User
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (userError) {
    console.error('Error creating user:', userError.message);
    process.exit(1);
  }

  const userId = userData.user.id;
  console.log(`User created with ID: ${userId}`);

  // 2. Create Profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      role: 'staff',
      full_name: name,
    });

  if (profileError) {
    console.error('Error creating profile:', profileError.message);
  } else {
    console.log('Profile created');
  }

  // 3. Update existing Staff record
  // Find existing Akane
  const { data: staffData, error: findError } = await supabase
    .from('staff')
    .select('id')
    .eq('display_name', 'Akane')
    .is('user_id', null)
    .single();

  if (staffData) {
      console.log(`Found existing unconnected staff Akane (ID: ${staffData.id}). Updating...`);
      const { error: updateError } = await supabase
        .from('staff')
        .update({
            user_id: userId,
            email: email,
            role: 'employee' // default role
        })
        .eq('id', staffData.id);

      if (updateError) {
          console.error('Error updating staff:', updateError.message);
      } else {
          console.log('Staff record updated successfully');
      }
  } else {
      console.log('No existing unconnected "Akane" found. Creating new staff record...');
      const { error: insertError } = await supabase
        .from('staff')
        .insert({
            user_id: userId,
            display_name: name,
            email: email,
            role: 'employee'
        });
      
       if (insertError) {
          console.error('Error creating staff:', insertError.message);
      } else {
          console.log('Staff record created successfully');
      }
  }
}

setupAkane();
