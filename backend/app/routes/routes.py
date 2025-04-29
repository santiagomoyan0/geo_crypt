from app.schemas.location_schema import LocationValidationRequest, LocationValidationResponse
from app.services.file_service import validate_location

@router.post("/validate-location", response_model=LocationValidationResponse)
async def validate_file_location(request: LocationValidationRequest):
    """
    Valida si la ubicación actual permite desencriptar el archivo.
    """
    is_valid = await validate_location(request)
    return LocationValidationResponse(access_granted=is_valid)