import type { VisitRequestInput } from '@studenthub/types';
import { withDatabase } from '../prisma/client.js';
import { sanitizePhone, sanitizeText } from '../utils/sanitize.js';

export type CreatedVisitRequest = {
  id: string;
  placeId: string;
  name: string;
  phone: string;
  preferredDate: string | null;
  note: string | null;
  status: 'PENDING';
  createdAt: string;
};

/**
 * Records a "Book a Visit" request.
 *
 * V1 has no owner dashboard to receive it, so when the database is unavailable
 * the request is acknowledged with `persisted: false` and the student app tells
 * the user it was saved locally. No payment or booking engine is involved yet.
 */
export async function createVisitRequest(
  input: VisitRequestInput,
  userId?: string,
): Promise<CreatedVisitRequest & { persisted: boolean }> {
  const name = sanitizeText(input.name, 80);
  const phone = sanitizePhone(input.phone);
  const note = input.note ? sanitizeText(input.note, 500) : null;
  const preferredDate = input.preferredDate ? new Date(input.preferredDate) : null;

  const created = await withDatabase(
    (prisma) =>
      prisma.visitRequest.create({
        data: {
          placeId: input.placeId,
          userId: userId ?? null,
          name,
          phone,
          preferredDate,
          note,
        },
      }),
    null,
  );

  if (created) {
    return {
      id: created.id,
      placeId: created.placeId,
      name: created.name,
      phone: created.phone,
      preferredDate: created.preferredDate?.toISOString() ?? null,
      note: created.note,
      status: 'PENDING',
      createdAt: created.createdAt.toISOString(),
      persisted: true,
    };
  }

  return {
    id: `demo-visit-${Date.now()}`,
    placeId: input.placeId,
    name,
    phone,
    preferredDate: preferredDate?.toISOString() ?? null,
    note,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    persisted: false,
  };
}