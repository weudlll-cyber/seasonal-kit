# What the game stores about a person

<!--
Template of the Seasonal kit (docs/HANDBOOK.md "Before production"). Copy it to the game's
docs/PRIVACY-DATA.md, replace every hint in angle brackets, add one row for each piece of personal
data the game keeps (and delete rows and sections that do not apply). The game's test:

  import { findPrivacyGaps } from '@seasonal/kit/testing';
  expect(findPrivacyGaps(readFileSync('docs/PRIVACY-DATA.md', 'utf8'))).toEqual([]);

The test sees that every cell is answered. Whether the list names everything the game stores is a
person's review: go through the database's tables, the logs, the files and the backups.
After Seasonal Bingo Royale's docs/PRIVACY-DATA.md.
-->

Every item <the game's name> keeps about a person, for the operator's privacy page. Two kinds of
install exist: **standalone** (the game's own accounts) and **website** (players sign in with their
Seasonal Entertainment account). "Deleted by" names what removes it: the person's own deletion, in
website mode also the website's report of a deleted account, or an age limit.

The database stores <what it never stores, e.g. no real name, address, IP address or payment data>.

## Both modes

| Data                | Purpose            | Stored in      | Seen by | Kept for   | Deleted by        | Leaves the server |
| ------------------- | ------------------ | -------------- | ------- | ---------- | ----------------- | ----------------- |
| <e.g. display name> | <why it is needed> | <table, field> | <who>   | <how long> | <what removes it> | <no, or to where> |

## Standalone mode only

| Data                  | Purpose            | Stored in      | Seen by | Kept for   | Deleted by        | Leaves the server |
| --------------------- | ------------------ | -------------- | ------- | ---------- | ----------------- | ----------------- |
| <e.g. e-mail address> | <why it is needed> | <table, field> | <who>   | <how long> | <what removes it> | <no, or to where> |

## Website mode only

| Data                   | Purpose            | Stored in      | Seen by | Kept for   | Deleted by        | Leaves the server |
| ---------------------- | ------------------ | -------------- | ------- | ---------- | ----------------- | ----------------- |
| <e.g. website user id> | <why it is needed> | <table, field> | <who>   | <how long> | <what removes it> | <no, or to where> |

## Logs and backups

| Data                      | Purpose            | Stored in              | Seen by      | Kept for         | Deleted by      | Leaves the server                |
| ------------------------- | ------------------ | ---------------------- | ------------ | ---------------- | --------------- | -------------------------------- |
| <e.g. IP address in logs> | <why it is needed> | <container log, files> | <who>        | <size or age>    | <rotation>      | <no, or to where>                |
| <everything above>        | restoring the game | encrypted backups      | the operator | <days and weeks> | <the retention> | <where the operator copies them> |
