import { randomUUID } from "node:crypto";

export async function addApprovedPhoto(query, accountId) {
  const id = randomUUID();
  await query(`INSERT INTO uss.media_assets(id,storage_provider,storage_key,mime_type,byte_size,width,height,uploaded_by,purpose)
    VALUES($1,'memory-test',$2,'image/webp',100,512,512,$3,'member_avatar')`, [id, `member-avatars/${id}.webp`, accountId]);
  await query("UPDATE uss.member_profiles SET avatar_status='approved',avatar_media_id=$2 WHERE account_id=$1", [accountId, id]);
}

export async function completeMemberFixture(query, accountId) {
  await query(`INSERT INTO uss.member_profiles(account_id,full_name,phone,emergency_contact_name,emergency_contact_phone)
    VALUES($1,'Synthetic Runner','+12025550100','Synthetic Contact','+12025550101')
    ON CONFLICT(account_id) DO UPDATE SET full_name=excluded.full_name,phone=excluded.phone,
      emergency_contact_name=excluded.emergency_contact_name,emergency_contact_phone=excluded.emergency_contact_phone`, [accountId]);
  await addApprovedPhoto(query, accountId);
}
