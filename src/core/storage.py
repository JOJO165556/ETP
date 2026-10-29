"""Service de stockage S3-compatible (MinIO en dev, Cloudflare R2 en prod)."""
import logging
import os
import uuid

import aioboto3
from botocore.exceptions import ClientError
from fastapi import UploadFile

from src.core.config import settings

logger = logging.getLogger(__name__)


class AsyncStorageService:
    def __init__(self) -> None:
        endpoint = getattr(settings, "S3_ENDPOINT_URL", None) or f"http://{settings.MINIO_ENDPOINT}"
        if "r2.cloudflarestorage.com" in (endpoint or "") and endpoint.startswith("http://"):
            endpoint = endpoint.replace("http://", "https://", 1)

        self.endpoint_url: str = endpoint
        self.access_key: str = getattr(settings, "S3_ACCESS_KEY_ID", None) or settings.MINIO_ACCESS_KEY
        self.secret_key: str = getattr(settings, "S3_SECRET_ACCESS_KEY", None) or settings.MINIO_SECRET_KEY
        self.bucket_cv: str = getattr(settings, "S3_BUCKET_CV", None) or settings.MINIO_BUCKET_CV
        self.bucket_docs: str = getattr(settings, "S3_BUCKET_NAME", None) or settings.MINIO_BUCKET_NAME
        self.region: str = getattr(settings, "S3_REGION", "auto") or "auto"
        self.public_url: str = getattr(settings, "S3_PUBLIC_URL", "") or ""

        self.session = aioboto3.Session()
        logger.info("StorageService → endpoint=%s bucket_cv=%s", self.endpoint_url, self.bucket_cv)

    def _get_client(self):
        return self.session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
        )

    async def initialize_buckets(self) -> None:
        for bucket in {self.bucket_cv, self.bucket_docs}:
            async with self._get_client() as s3:
                try:
                    await s3.head_bucket(Bucket=bucket)
                except ClientError as exc:
                    code = exc.response.get("Error", {}).get("Code", "")
                    if code in ("404", "NoSuchBucket"):
                        try:
                            await s3.create_bucket(Bucket=bucket)
                            logger.info("Bucket '%s' créé.", bucket)
                        except ClientError:
                            logger.warning("Bucket '%s' introuvable et non créable (vérifier le dashboard R2).", bucket)
                    else:
                        logger.error("Erreur bucket '%s': %s", bucket, exc)

    async def upload_cv(self, file: UploadFile) -> str:
        ext = os.path.splitext(file.filename or "file.bin")[1] or ".bin"
        key = f"cvs/{uuid.uuid4()}{ext}"
        async with self._get_client() as s3:
            content = await file.read()
            await s3.put_object(
                Bucket=self.bucket_cv,
                Key=key,
                Body=content,
                ContentType=file.content_type or "application/octet-stream",
            )
        logger.info("CV uploadé → key=%s size=%d", key, len(content))
        return key

    async def upload_document(self, file: UploadFile, prefix: str = "docs") -> str:
        ext = os.path.splitext(file.filename or "file.bin")[1] or ".bin"
        key = f"{prefix}/{uuid.uuid4()}{ext}"
        async with self._get_client() as s3:
            content = await file.read()
            await s3.put_object(
                Bucket=self.bucket_docs,
                Key=key,
                Body=content,
                ContentType=file.content_type or "application/octet-stream",
            )
        return key

    async def generate_presigned_url(self, file_key: str, expires_in: int = 3600) -> str:
        if self.public_url:
            return f"{self.public_url.rstrip('/')}/{file_key}"
        async with self._get_client() as s3:
            url: str = await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_cv, "Key": file_key},
                ExpiresIn=expires_in,
            )
        return url

    async def download_file(self, file_key: str, destination_path: str) -> None:
        async with self._get_client() as s3:
            response = await s3.get_object(Bucket=self.bucket_cv, Key=file_key)
            async with response["Body"] as stream:
                data = await stream.read()
        with open(destination_path, "wb") as fh:
            fh.write(data)

    async def delete_file(self, file_key: str, bucket: str | None = None) -> None:
        target = bucket or self.bucket_cv
        async with self._get_client() as s3:
            await s3.delete_object(Bucket=target, Key=file_key)
        logger.info("Fichier supprimé → bucket=%s key=%s", target, file_key)