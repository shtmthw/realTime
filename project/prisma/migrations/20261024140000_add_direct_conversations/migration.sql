-- Saved direct-message conversations.
-- Idempotent so a partially-applied deploy can be retried safely.

CREATE TABLE IF NOT EXISTS `directConversation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userAId` INTEGER NOT NULL,
    `userBId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `directConversation_userAId_userBId_key`(`userAId`, `userBId`),
    INDEX `directConversation_userAId_idx`(`userAId`),
    INDEX `directConversation_userBId_idx`(`userBId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `directConversation_userAId_fkey` FOREIGN KEY (`userAId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `directConversation_userBId_fkey` FOREIGN KEY (`userBId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
