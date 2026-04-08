# Series Registration (Blockchain)

Series group multiple courses under a single theme on the frontend's Series tab. Series registration is **separate from the per-course pipeline** — it is done manually after two or more courses exist under the same paper-slug.

## Data location

Series data is stored on the AIN blockchain at:

```
/apps/knowledge/series/{series-slug}/
```

## courseId format

**CRITICAL**: courseId uses **double-dash** (`--`) as separator, not slash.

```
{paper-slug}--{course-name-slug}
```

Examples:
- `curious-nyang-intent-guide--best-intent-worker`
- `blockchain-decentralization-fundamentals--core`
- `attention-is-all-you-need--bible`

## Series data schema

```json
{
  "title": "Series Title",
  "description": "One-line series description",
  "thumbnailUrl": "filename.png",
  "creatorAddress": "0x...",
  "createdAt": 1700000000000,
  "groups": {
    "GroupName": {
      "0": { "courseId": "{paper-slug}--{course-slug}" },
      "1": { "courseId": "{paper-slug}--{course-slug}" }
    }
  }
}
```

Field details:

| Field | Required | Description |
|------|------|------|
| `title` | Yes | Series title displayed on the frontend |
| `description` | Yes | Series description |
| `thumbnailUrl` | No | Image filename in `awesome-papers-with-claude-code/assets/` |
| `creatorAddress` | Yes | Creator's wallet address |
| `createdAt` | Yes | Timestamp in milliseconds |
| `groups` | Yes | Grouped courses — keys are group names, values are indexed course entries |

Group behavior:
- **1 group** → no tabs shown on frontend
- **2+ groups** → automatic tab navigation (e.g., "English" / "Korean")

Each entry supports an optional `achievementUrl` field for external badge/certificate links.

## Thumbnail

Series thumbnails are stored in `awesome-papers-with-claude-code/assets/` and referenced by filename only. The frontend prepends the GitHub raw URL:

```
https://raw.githubusercontent.com/ainblockchain/awesome-papers-with-claude-code/main/assets/{thumbnailUrl}
```

## Registration script

Run from any course directory that has `blockchain/node_modules/@ainblockchain/ain-js` installed:

```bash
node -e "
  (async () => {
    const Ain = require('./blockchain/node_modules/@ainblockchain/ain-js').default;
    const fs = require('fs'), os = require('os'), path = require('path');

    const ainConfigPath = path.join(os.homedir(), '.claude', 'ain-config.json');
    const pk = JSON.parse(fs.readFileSync(ainConfigPath, 'utf-8')).privateKey;

    const ain = new Ain('https://devnet-api.ainetwork.ai', null, 0);
    ain.wallet.addAndSetDefaultAccount(pk);
    const address = ain.wallet.defaultAccount.address;

    const seriesSlug = '<series-slug>';
    const seriesData = {
      title: '<Series Title>',
      description: '<Series description>',
      thumbnailUrl: '<filename>.png',
      creatorAddress: address,
      createdAt: Date.now(),
      groups: {
        '<GroupName>': {
          '0': { courseId: '<paper-slug>--<course-slug-1>' },
          '1': { courseId: '<paper-slug>--<course-slug-2>' }
        }
      }
    };

    const result = await ain.db.ref('/apps/knowledge/series/' + seriesSlug).setValue({
      value: seriesData,
      nonce: -1
    });

    console.log(JSON.stringify({ success: true, code: result.result.code, seriesSlug, address }));
  })();
"
```

Replace all `<placeholder>` values with actual values.

- On success, print: `⛓️ Series registration complete: <series-slug> (<N> courses)`
- On failure, print the error and continue
- To **update** an existing series (e.g., add a new course), re-run the script with the full updated data — `setValue` overwrites the entire series entry
