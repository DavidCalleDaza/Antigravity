from pydantic import BaseModel, Field

class GenerateCopyRequest(BaseModel):
    product_name: str = Field(..., description="Name of the product or service")
    description: str = Field(..., description="Description of the product or service")
    tone: str = Field(default="persuasivo", description="Tone of the generated copy")

class GenerateVideoRequest(BaseModel):
    image_gcs_uri: str = Field(..., description="GCS URI of the uploaded image")
    prompt: str = Field(..., description="Prompt for the video generation")
    product_id: str | None = None
    service_id: str | None = None

