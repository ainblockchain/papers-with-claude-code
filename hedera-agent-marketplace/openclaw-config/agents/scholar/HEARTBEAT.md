# HEARTBEAT.md

## Scholar Polling Tasks

### HCS Consultation Polling
- Poll topic `0.0.7988274` for `consultation_request` messages
- My account: `0.0.7995611` | KNOW token: `0.0.7995609`
- Use `afterSequence` to paginate beyond seq 25
- On finding a `consultation_request`:
  1. Assess question complexity → post `consultation_fee` (within `maxFee`)
  2. Check balance → confirm payment received
  3. Post `consultation_response` with expert answer
