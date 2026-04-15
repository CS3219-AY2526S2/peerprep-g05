# Init User
docker compose up -d --build
docker compose --profile migrate run --rm user-migrate

# Comment out to not insert master_admin as MASTER_ADMIN
docker exec -i peerprep-user-db psql -U postgres -d peerprep_users -c \
"INSERT INTO users (email, username, password_hash, role, is_active)
VALUES('master_admin@example.com', 'master_admin', '$2b$12$oc1yyQuLA4pqWT05Z9h40eltMaLmnCRQ1XBOHMVF9P8qiLdG28AzG', 'MASTER_ADMIN'. true)
"

# Comment it to update user to MASTER_ADMIN
# docker exec -i peerprep-user-db psql -U postgres -d peerprep_users -c \
# "UPDATE users
#  SET role = 'MASTER_ADMIN'
#  WHERE username = '' # Replace with the username you want.
#  RETURNING id, email, username, role, is_active;"
