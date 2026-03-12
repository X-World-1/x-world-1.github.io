#!/usr/bin/env python3
import os
import glob
import re

def get_sorted_videos(directory_path):
    """
    获取目录下所有 mp4 文件，并根据文件名中的数字或字母进行排序。
    支持多种命名格式：如 test_1.mp4、test_01.mp4、videoA.mp4、xxx_abc_123.mp4 等。
    """
    video_files = glob.glob(os.path.join(directory_path, "*.mp4"))
    def extract_key(filename):
        # 尝试提取文件名中的第一个数字序号，否则用全名排序
        basename = os.path.basename(filename)
        # 匹配所有数字
        nums = re.findall(r'\d+', basename)
        if nums:
            # 返回第一个数字作为主排序键，后面补充全名保证稳定性
            return (int(nums[0]), basename)
        else:
            # 没有数字则按文件名排序
            return (float('inf'), basename)
    video_files.sort(key=extract_key)
    return [f.replace("\\", "/") for f in video_files]

def generate_video_array(directory_path, variable_name="video_gta"):
    """
    生成指定目录下所有 .mp4 文件的 JavaScript 数组格式
    """
    video_paths = get_sorted_videos(directory_path)
    paths_str = "', '".join(video_paths)
    result = f"const {variable_name}=['{paths_str}']"
    return result

def main():
    # 需要处理的所有目录及变量名
    directories = [
        ("static/videos/gta", "video_gta"),
        ("static/videos/mc", "video_mc"),
        ("static/videos/unreals", "video_unreals"),
        ("static/videos/longvideos", "video_longs"),
        ("static/videos/templerun", "video_templerun"),
    ]
    for dir_path, var_name in directories:
        if not os.path.exists(dir_path):
            print(f"警告: 目录 {dir_path} 不存在，跳过。")
            continue
        array_str = generate_video_array(dir_path, var_name)
        print(array_str)
        print()

if __name__ == "__main__":
    main()