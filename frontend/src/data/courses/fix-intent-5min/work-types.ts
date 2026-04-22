export type WorkTypeKey =
  | 'add'
  | 'newIntent'
  | 'update'
  | 'newIntentDev'
  | 'sql'
  | 'bug';

export interface WorkType {
  key: WorkTypeKey;
  label: string;
  bg: string;
  text: string;
  chartColor: string;
}

export const WORK_TYPES: readonly WorkType[] = [
  {
    key: 'add',
    label: 'Add Triggering Sentence',
    bg: '#DBEDDB',
    text: '#448361',
    chartColor: 'rgba(114,188,143,1)',
  },
  {
    key: 'newIntent',
    label: 'New Intent',
    bg: '#E8DEEE',
    text: '#6940A5',
    chartColor: 'rgba(191,142,218,1)',
  },
  {
    key: 'update',
    label: 'Update Intent',
    bg: '#D3E5EF',
    text: '#337EA9',
    chartColor: 'rgba(94,159,232,1)',
  },
  {
    key: 'newIntentDev',
    label: 'New Intent+Dev',
    bg: '#FADEE9',
    text: '#AD1A72',
    chartColor: 'rgba(223,132,168,1)',
  },
  {
    key: 'sql',
    label: 'SQL/Workflow',
    bg: '#F1DEE5',
    text: '#9E3F69',
    chartColor: 'rgba(190,120,150,1)',
  },
  {
    key: 'bug',
    label: 'Bug Report/QA',
    bg: '#FADEC9',
    text: '#C4704F',
    chartColor: 'rgba(222,146,85,1)',
  },
];

export function getWorkType(key: WorkTypeKey): WorkType {
  const found = WORK_TYPES.find((w) => w.key === key);
  if (!found) throw new Error(`Unknown work type key: ${key}`);
  return found;
}
