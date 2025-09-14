import prisma from '../prismaClient';
import { isUserOnline } from '../presence';

export class FriendService {
  static async sendRequest(senderId: string, receiverUsername: string) {
    const receiver = await prisma.user.findUnique({ where: { username: receiverUsername } });
    if (!receiver) throw new Error('User not found');
    if (receiver.id === senderId) throw new Error('Cannot friend yourself');

    // Check existing friendship
  const existingFriend = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: senderId, userBId: receiver.id },
          { userAId: receiver.id, userBId: senderId }
        ]
      }
    });
    if (existingFriend) throw new Error('Already friends');

  const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId }
        ],
        status: 'PENDING'
      }
    });
    if (existingRequest) throw new Error('Request already pending');

  return prisma.friendRequest.create({ data: { senderId, receiverId: receiver.id } });
  }

  static async listRequests(userId: string) {
  return prisma.friendRequest.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: { sender: true, receiver: true }
    });
  }

  static async respond(requestId: string, userId: string, accept: boolean) {
  const req = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new Error('Request not found');
    if (req.receiverId !== userId) throw new Error('Not authorized');
    if (req.status !== 'PENDING') throw new Error('Already handled');

  const updated = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: accept ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() }
    });

    if (accept) {
  await prisma.friendship.create({ data: { userAId: req.senderId, userBId: req.receiverId } });
    }
    return updated;
  }

  static async listFriends(userId: string) {
    const friendsA = await prisma.friendship.findMany({ where: { userAId: userId }, include: { userB: true } });
    const friendsB = await prisma.friendship.findMany({ where: { userBId: userId }, include: { userA: true } });
    const users = [
      ...friendsA.map(f => f.userB),
      ...friendsB.map(f => f.userA)
    ];
    // Deduplicate (in case) and add online flag
    const seen = new Set<string>();
    return users.filter(u => {
      if (seen.has(u.id)) return false; seen.add(u.id); return true;
    }).map(u => ({ ...u, online: isUserOnline(u.id) }));
  }
}
