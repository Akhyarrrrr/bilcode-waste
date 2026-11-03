# Demo image attribution

The 24 photos in this folder are **train-split** samples from RealWaste:
Single, Iranmanesh and Raad (2023), DOI <https://doi.org/10.24432/C5SS4G>,
original release <https://github.com/sam-single/realwaste/tree/156e8e9154eeb163df30fcfd767f55b19633bb06>.
No photo belongs to the held-out test split used for the reported accuracy.

`catalog.json` lists, per file, the original dataset path, SHA-256, and the deployed model's
real prediction for that photo (`realwaste-mobilenetv3-099ff8e5e058`, stored as WebP q82 exactly
like the API does; `durationMs` measured locally on CPU). The selection keeps photos the model
classifies correctly, so the demo shows the intended flow; it is not an evaluation sample.

Report titles, places and coordinates around Banda Aceh are simulated and do not describe where
the photos were taken.

Licensing: the original release states CC BY-NC-SA 4.0 and UCI metadata states CC BY 4.0. Both
notices are retained and the images are used only as attributed, non-commercial assessment demo data.
