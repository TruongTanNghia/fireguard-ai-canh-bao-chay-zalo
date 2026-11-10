import logging
import torch

logger = logging.getLogger(__name__)


def resolve_torch_device() -> str:
    """Tự động kiểm tra GPU NVIDIA CUDA hoặc CPU."""
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        logger.info(f"[ComputeDevice] Sử dụng GPU: {gpu_name} (CUDA)")
        return "cuda:0"
    logger.info("[ComputeDevice] Không có GPU khả dụng -> Sử dụng CPU")
    return "cpu"


def get_ai_device_policy() -> tuple[str, str]:
    device = resolve_torch_device()
    warning = ""
    if device == "cpu":
        warning = "Hệ thống đang chạy trên CPU. Khuyến nghị sử dụng GPU NVIDIA để tăng tốc độ nhận diện AI."
    return device, warning
