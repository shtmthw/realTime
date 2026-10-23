-- Idempotent migration: adds group chat support to schemas created by older migrations.
-- Safe to re-run on both fresh and existing databases: every change is guarded
-- by an existence check using information_schema + prepared statements.
-- (No DELIMITER/stored procedures: Prisma executes migration SQL as raw statements.)

-- Tables (idempotent)
CREATE TABLE IF NOT EXISTS `group` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `creatorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `groupMember` (
    `userId` INTEGER NOT NULL,
    `groupId` INTEGER NOT NULL,
    PRIMARY KEY (`userId`, `groupId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Make receiverID nullable (safe no-op if already nullable)
ALTER TABLE `messages` MODIFY `receiverID` INTEGER NULL;

-- Add messages.groupID column if missing
SET @groupid_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'messages'
      AND column_name = 'groupID'
);
SET @groupid_ddl = IF(@groupid_exists = 0,
    'ALTER TABLE `messages` ADD COLUMN `groupID` INTEGER NULL',
    'SELECT "messages.groupID already exists"'
);
PREPARE stmt FROM @groupid_ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Idempotent foreign keys: add only if constraint name is missing
SET @fk_group_creator_exists = (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'group'
      AND constraint_name = 'group_creatorId_fkey'
);
SET @fk_group_creator_ddl = IF(@fk_group_creator_exists = 0,
    'ALTER TABLE `group` ADD CONSTRAINT `group_creatorId_fkey` FOREIGN KEY (creatorId) REFERENCES `user`(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT "group_creatorId_fkey already exists"'
);
PREPARE stmt FROM @fk_group_creator_ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_msg_sender_exists = (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'messages'
      AND constraint_name = 'messages_senderID_fkey'
);
SET @fk_msg_sender_ddl = IF(@fk_msg_sender_exists = 0,
    'ALTER TABLE `messages` ADD CONSTRAINT `messages_senderID_fkey` FOREIGN KEY (senderID) REFERENCES `user`(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT "messages_senderID_fkey already exists"'
);
PREPARE stmt FROM @fk_msg_sender_ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_msg_receiver_exists = (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'messages'
      AND constraint_name = 'messages_receiverID_fkey'
);
SET @fk_msg_receiver_ddl = IF(@fk_msg_receiver_exists = 0,
    'ALTER TABLE `messages` ADD CONSTRAINT `messages_receiverID_fkey` FOREIGN KEY (receiverID) REFERENCES `user`(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT "messages_receiverID_fkey already exists"'
);
PREPARE stmt FROM @fk_msg_receiver_ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_msg_group_exists = (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'messages'
      AND constraint_name = 'messages_groupID_fkey'
);
SET @fk_msg_group_ddl = IF(@fk_msg_group_exists = 0,
    'ALTER TABLE `messages` ADD CONSTRAINT `messages_groupID_fkey` FOREIGN KEY (groupID) REFERENCES `group`(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT "messages_groupID_fkey already exists"'
);
PREPARE stmt FROM @fk_msg_group_ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_gm_user_exists = (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'groupMember'
      AND constraint_name = 'groupMember_userId_fkey'
);
SET @fk_gm_user_ddl = IF(@fk_gm_user_exists = 0,
    'ALTER TABLE `groupMember` ADD CONSTRAINT `groupMember_userId_fkey` FOREIGN KEY (userId) REFERENCES `user`(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT "groupMember_userId_fkey already exists"'
);
PREPARE stmt FROM @fk_gm_user_ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_gm_group_exists = (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'groupMember'
      AND constraint_name = 'groupMember_groupId_fkey'
);
SET @fk_gm_group_ddl = IF(@fk_gm_group_exists = 0,
    'ALTER TABLE `groupMember` ADD CONSTRAINT `groupMember_groupId_fkey` FOREIGN KEY (groupId) REFERENCES `group`(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT "groupMember_groupId_fkey already exists"'
);
PREPARE stmt FROM @fk_gm_group_ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
