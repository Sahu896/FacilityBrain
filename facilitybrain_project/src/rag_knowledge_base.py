"""
FacilityBrain — RAG Knowledge Base
Chunks the two PRDs (Deviation Engine + Health Score Spec) by section (##/###
markdown headers), builds a TF-IDF index over the chunks, and exposes a
retrieve(query, k) function. This is the "R" in the RAG assistant (Model 4) —
the LLM call itself happens client-side in the dashboard artifact so it can
use live Claude API access; this module just prepares the grounding context.
"""
import re
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from paths import DATA_DIR, OUTPUTS_DIR


def chunk_markdown(path, source_name):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    # split on lines starting with ## or ### (keep the header with its body)
    parts = re.split(r"\n(?=##+ )", text)
    chunks = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        header_match = re.match(r"(##+)\s*(.+)", part)
        header = header_match.group(2) if header_match else "Intro"
        chunks.append(dict(source=source_name, header=header, text=part))
    return chunks


def build_index(chunks):
    texts = [c["text"] for c in chunks]
    vectorizer = TfidfVectorizer(stop_words="english", max_features=2000)
    matrix = vectorizer.fit_transform(texts)
    return vectorizer, matrix


def retrieve(query, chunks, vectorizer, matrix, k=4):
    qvec = vectorizer.transform([query])
    sims = cosine_similarity(qvec, matrix)[0]
    ranked = sims.argsort()[::-1][:k]
    return [dict(score=round(float(sims[i]), 3), **chunks[i]) for i in ranked if sims[i] > 0]


def build_knowledge_base(data_dir=DATA_DIR):
    chunks = (
        chunk_markdown(f"{data_dir}/deviation_engine_prd.md", "Deviation Engine PRD")
        + chunk_markdown(f"{data_dir}/health_score_spec.md", "Health Score Calculation Spec")
    )
    vectorizer, matrix = build_index(chunks)
    return chunks, vectorizer, matrix


if __name__ == "__main__":
    import os
    chunks, vectorizer, matrix = build_knowledge_base()
    print(f"Indexed {len(chunks)} chunks:")
    for c in chunks:
        print(f"  [{c['source']}] {c['header']}")

    # Save chunks (without the fitted vectorizer, which isn't JSON-serializable)
    # for the dashboard artifact to embed directly as its RAG corpus.
    with open(os.path.join(OUTPUTS_DIR, "rag_chunks.json"), "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2)

    # quick sanity test of retrieval
    for q in ["MTTF exponential formula", "humidity band business rule", "risk category mapping"]:
        print(f"\nQuery: {q}")
        for r in retrieve(q, chunks, vectorizer, matrix, k=2):
            print(f"  ({r['score']}) [{r['source']}] {r['header']}")
