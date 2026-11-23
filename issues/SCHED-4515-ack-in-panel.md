---
id: SCHED-4515
title: Ack moves from the row to an incident panel
status: ready
plan: R1, R2
---

Found in the step-1 recording at 00:16: the pointer was on the Ack of INC-3372, a new incident arrived, every row
moved down one place, and the click acked INC-3459. Product's decision: new incidents stay live at the top; Ack
leaves the row. A row opens its incident panel (`data-testid="incident-panel"`, naming the incident id), and Ack
lives there (`data-testid="panel-ack"`). The row-level `ack` hook goes away.

Acceptance: a click on a row that moved opens the panel of the row now under the pointer, so the panel shows which
incident will be acked before anything is sent; the panel's Ack acks only the incident it names. Rows on the board
are not removed or rebuilt when new incidents arrive.
