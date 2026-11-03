# RealWaste MobileNetV3 Small

Version: `realwaste-mobilenetv3-099ff8e5e058`.

This assessment classifier predicts ORGANIC, PLASTIC or PAPER from one image. Its FP32 ONNX artifact is 6,093,347 bytes with SHA256 `099ff8e5e058079945f3f41ac8db86152da7846044f54545e209d449c8b84de9`. Class order is exactly `[ORGANIC, PLASTIC, PAPER]`. The PyTorch checkpoint is included for reproducibility, while deployment uses ONNX Runtime only.

Training used ImageNet-pretrained torchvision MobileNetV3 Small on 2,268 RealWaste images: Food Organics and Vegetation map to ORGANIC, Plastic to PLASTIC, and Paper to PAPER. No corrupt images or exact duplicates were found. Near-duplicate difference hashes were grouped before a seeded 70/15/15 split, resulting in 1,588 training, 340 validation and 340 test images. All selected image SHA256s match the official UCI archive. The manifest and source records are included; raw images are excluded.

Five head epochs were followed by 19 fine-tuning epochs. Validation macro F1 selected fine-tuning epoch 12; patience 7 stopped training without inspecting the test set. Training took 747.25 seconds on an RTX3050 Laptop GPU. Train-class weighting, train-only augmentation, AdamW, cosine decay and mixed precision were used. See `config.json`, `history.json` and `selection.json`.

## Held-out result

The selected model classified 335/340 held-out images correctly: **98.5294% accuracy**, **0.986494 macro F1**. Validation accuracy was 99.1176%, with macro F1 0.990644. The test was evaluated only after selection was locked; no test-driven model or split changes were made.

| Class | Precision | Recall | F1 | Test images |
| --- | ---: | ---: | ---: | ---: |
| ORGANIC |0.976744|0.992126|0.984375|127|
| PLASTIC |0.985401|0.978261|0.981818|138|
| PAPER |1.000000|0.986667|0.993289|75|

Confusion rows and columns follow the class order above: `[[126,1,0],[3,135,0],[0,1,74]]`. Full precision metrics, normalized confusion matrix, per-image probabilities and all five errors are in `evaluation/`. Learning curves, confusion-matrix plots and example errors are included.

PyTorch and ONNX predictions agree on every held-out top label. Maximum absolute probability difference was `7.748603820800781e-06`, below the `1e-4` parity threshold. Runtime/pretrained-weight preprocessing difference was exactly zero. Inference resizes the short side to 256 using bilinear interpolation, center-crops 224, normalizes orientation/RGB, scales pixels to 0..1 and applies ImageNet mean/std as recorded in `metadata.json`.

## Intended use and limits

Use for the waste-reporting assessment demo and reproducible model evaluation. This three-class model cannot identify unknown material, mixed waste, hazardous material or excluded RealWaste classes. Softmax confidence is uncalibrated. Cardboard was not included as paper. Accuracy from one Australian landfill collection does not establish performance on phone photos, household waste or other locations. Perceptual grouping reduces near-duplicate leakage; capture-session identifiers were unavailable. Center cropping can omit relevant objects. No multi-seed robustness, calibration or deployment cold-start claim is made.

## Attribution and licensing

Single, S., Iranmanesh, S., and Raad, R. (2023). [RealWaste](https://archive.ics.uci.edu/dataset/908/realwaste). UCI Machine Learning Repository. DOI [10.24432/C5SS4G](https://doi.org/10.24432/C5SS4G). [Original release](https://github.com/sam-single/realwaste), commit `156e8e9154eeb163df30fcfd767f55b19633bb06`.

UCI lists CC BY 4.0, but the original release explicitly lists CC BY-NC-SA 4.0. Resolve the conflict before commercial use or redistribution. This report does not grant broader rights to dataset-derived artifacts.
