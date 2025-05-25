-- Update the handle_new_user function to better handle LINE users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    role, 
    email_verified, 
    username,
    line_user_id,
    avatar_url,
    credits
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', ''), 
    new.email, 
    'user', 
    CASE 
      WHEN new.raw_user_meta_data->>'line_user_id' IS NOT NULL THEN true 
      ELSE false 
    END, -- LINE users are automatically verified
    COALESCE(
      new.raw_user_meta_data->>'username', 
      CASE 
        WHEN new.raw_user_meta_data->>'line_user_id' IS NOT NULL 
        THEN 'line_' || new.raw_user_meta_data->>'line_user_id'
        ELSE new.email
      END
    ),
    new.raw_user_meta_data->>'line_user_id',
    new.raw_user_meta_data->>'avatar_url',
    100
  )
  ON CONFLICT (id) DO UPDATE SET
    line_user_id = EXCLUDED.line_user_id,
    avatar_url = EXCLUDED.avatar_url,
    email_verified = CASE 
      WHEN EXCLUDED.line_user_id IS NOT NULL THEN true 
      ELSE profiles.email_verified 
    END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
