import type { LangId } from '../engine/types';

export interface Sample {
  readonly id: string;
  readonly label: string;
  readonly lang: LangId;
  readonly code: string;
}

export const samples: readonly Sample[] = [
  {
    id: 'express',
    label: 'API Express',
    lang: 'javascript',
    code: `const express = require('express');
const app = express();

app.use(express.json());

const users = new Map();

app.get('/users/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.post('/users', (req, res) => {
  const { name, email } = req.body;
  const id = crypto.randomUUID();
  users.set(id, { id, name, email });
  res.status(201).json({ id, name, email });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
`,
  },
  {
    id: 'array',
    label: 'Manipulation de tableaux',
    lang: 'javascript',
    code: `const numbers = [1, -2, 3, -4, 5];

const positives = numbers.filter((n) => n > 0);
const doubled = positives.map((n) => n * 2);
const total = doubled.reduce((sum, n) => sum + n, 0);

console.log('Total:', total);
`,
  },
  {
    id: 'typescript',
    label: 'Types TypeScript',
    lang: 'typescript',
    code: `interface User {
  id: string;
  name: string;
}

type Result = User | null;

const findUser = (users: User[], id: string): Result => {
  return users.find((u) => u.id === id) ?? null;
};
`,
  },
  {
    id: 'suspicious',
    label: 'Package suspect (audit)',
    lang: 'javascript',
    code: `const cp = require('child_process');

function install() {
  const payload = Buffer.from(process.env.TOKEN, 'base64').toString();
  eval(payload);
}

install();
`,
  },
];
