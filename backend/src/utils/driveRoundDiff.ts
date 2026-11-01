export interface DriveRound {
  name?: string;
  date?: string;
  venue?: string;
  meetingLink?: string;
  description?: string;
}

export type DriveChangeType =
  | 'schedule_change'
  | 'venue_change'
  | 'meeting_link_change'
  | 'round_change'
  | 'other';

export interface RoundDiffResult {
  hasChanges: boolean;
  changeTypes: DriveChangeType[];
  primaryChangeType: DriveChangeType;
  summary: string;
}

export function diffDriveRounds(
  oldRounds: DriveRound[] = [],
  newRounds: DriveRound[] = []
): RoundDiffResult {
  const changeTypes = new Set<DriveChangeType>();
  const descriptions: string[] = [];

  if (oldRounds.length !== newRounds.length) {
    changeTypes.add('round_change');
    descriptions.push(`Round count changed from ${oldRounds.length} to ${newRounds.length}`);
  }

  const maxLen = Math.max(oldRounds.length, newRounds.length);
  for (let i = 0; i < maxLen; i++) {
    const o = oldRounds[i];
    const n = newRounds[i];

    if (!o && n) {
      descriptions.push(`Added round "${n.name || `#${i + 1}`}"`);
      changeTypes.add('round_change');
    } else if (o && !n) {
      descriptions.push(`Removed round "${o.name || `#${i + 1}`}"`);
      changeTypes.add('round_change');
    } else if (o && n) {
      if (o.name !== n.name) {
        descriptions.push(`Renamed round ${i + 1} from "${o.name}" to "${n.name}"`);
        changeTypes.add('round_change');
      }
      if (o.date !== n.date) {
        descriptions.push(
          `Schedule changed for "${n.name || `#${i + 1}`}" (${o.date || 'TBD'} -> ${n.date || 'TBD'})`
        );
        changeTypes.add('schedule_change');
      }
      if (o.venue !== n.venue) {
        descriptions.push(
          `Venue changed for "${n.name || `#${i + 1}`}" (${o.venue || 'None'} -> ${n.venue || 'None'})`
        );
        changeTypes.add('venue_change');
      }
      if (o.meetingLink !== n.meetingLink) {
        descriptions.push(`Meeting link changed for "${n.name || `#${i + 1}`}"`);
        changeTypes.add('meeting_link_change');
      }
    }
  }

  const typesArray = Array.from(changeTypes);
  const primaryChangeType =
    typesArray.find((t) => t === 'schedule_change') ||
    typesArray.find((t) => t === 'round_change') ||
    typesArray.find((t) => t === 'venue_change') ||
    typesArray.find((t) => t === 'meeting_link_change') ||
    'other';

  return {
    hasChanges: typesArray.length > 0,
    changeTypes: typesArray,
    primaryChangeType,
    summary: descriptions.join('; '),
  };
}

