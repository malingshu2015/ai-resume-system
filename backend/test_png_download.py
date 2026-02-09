import httpx
import asyncio

async def test_png_download():
    """测试完整的 PNG 导出和下载流程"""
    
    base_url = "http://127.0.0.1:8000/api/v1"
    
    # 1. 导出 PNG
    print("步骤 1: 导出 PNG 长图...")
    export_payload = {
        "resume_data": {
            "content": {
                "personal_info": {
                    "name": "测试用户",
                    "title": "高级工程师",
                    "contact": {
                        "email": "test@example.com",
                        "phone": "13800138000"
                    }
                }
            },
            "template": "modern"
        },
        "format": "png"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # 导出
            response = await client.post(f"{base_url}/resume-generator/export", json=export_payload)
            print(f"导出响应状态: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ 导出成功!")
                print(f"   文件路径: {data['file_path']}")
                print(f"   下载URL: {data['download_url']}")
                
                # 2. 下载文件
                print("\n步骤 2: 下载 PNG 文件...")
                download_url = f"{base_url}{data['download_url']}"
                download_response = await client.get(download_url)
                
                print(f"下载响应状态: {download_response.status_code}")
                print(f"Content-Type: {download_response.headers.get('content-type')}")
                print(f"Content-Disposition: {download_response.headers.get('content-disposition')}")
                print(f"文件大小: {len(download_response.content)} bytes ({len(download_response.content)/1024:.2f} KB)")
                
                # 检查是否是真正的 PNG
                if download_response.content[:8] == b'\x89PNG\r\n\x1a\n':
                    print("✅ 确认是有效的 PNG 图片文件!")
                else:
                    print("❌ 文件不是有效的 PNG 格式!")
                    
            else:
                print(f"❌ 导出失败: {response.text}")
                
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_png_download())
