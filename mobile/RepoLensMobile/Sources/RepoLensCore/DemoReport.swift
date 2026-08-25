import Foundation

public extension ResearchReport {
    static let segmentAnythingDemo = ResearchReport(
        repository: "facebookresearch/segment-anything",
        revision: "6fdee8f2727f4506cfbbe553e23b895e27956588",
        title: "Segment Anything",
        summary: "Trace how SamPredictor caches image embeddings and reuses them across prompt-driven mask predictions.",
        evidence: [
            EvidenceCard(
                id: "E-07",
                title: "Image embeddings are cached once",
                path: "segment_anything/predictor.py",
                lineRange: "55–91",
                excerpt: "self.features = self.model.image_encoder(input_image)",
                explanation: "set_image preprocesses the image, computes image embeddings, and marks the predictor ready for prompt reuse.",
                sourceURL: URL(string: "https://github.com/facebookresearch/segment-anything/blob/6fdee8f2727f4506cfbbe553e23b895e27956588/segment_anything/predictor.py#L55-L91")!
            ),
            EvidenceCard(
                id: "E-11",
                title: "Prompts reuse the stored features",
                path: "segment_anything/predictor.py",
                lineRange: "154–235",
                excerpt: "masks, iou_predictions, low_res_masks = self.model.mask_decoder(...) ",
                explanation: "predict_torch combines prompt embeddings with the stored image embeddings before decoding masks.",
                sourceURL: URL(string: "https://github.com/facebookresearch/segment-anything/blob/6fdee8f2727f4506cfbbe553e23b895e27956588/segment_anything/predictor.py#L154-L235")!
            ),
            EvidenceCard(
                id: "E-19",
                title: "The repository documents model setup",
                path: "README.md",
                lineRange: "55–78",
                excerpt: "sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)",
                explanation: "The README provides the model-registry setup used by the reproduction plan.",
                sourceURL: URL(string: "https://github.com/facebookresearch/segment-anything/blob/6fdee8f2727f4506cfbbe553e23b895e27956588/README.md#L55-L78")!
            )
        ],
        reproductionSteps: [
            ReproductionStep(
                title: "Install the package",
                command: "pip install git+https://github.com/facebookresearch/segment-anything.git",
                provenance: "README.md · installation section"
            ),
            ReproductionStep(
                title: "Download a checkpoint",
                command: "wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth",
                provenance: "README.md · model checkpoints"
            ),
            ReproductionStep(
                title: "Run automatic mask generation",
                command: "python scripts/amg.py --checkpoint <path/to/checkpoint> --model-type <model_type> --input <input> --output <output>",
                provenance: "README.md · automatic mask generation"
            )
        ]
    )
}
