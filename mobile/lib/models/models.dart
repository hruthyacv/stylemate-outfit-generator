import '../api/api_service.dart';

class WardrobeItem {
  final String id;
  final String name;
  final String category;
  final String style;
  final String color;
  final String imagePath;

  WardrobeItem({
    required this.id,
    required this.name,
    required this.category,
    required this.style,
    required this.color,
    required this.imagePath,
  });

  factory WardrobeItem.fromJson(Map<String, dynamic> json) {
    return WardrobeItem(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      category: json['category'] ?? '',
      style: json['style'] ?? '',
      color: json['color'] ?? '',
      imagePath: json['image_path'] ?? '',
    );
  }

  String get fullImageUrl {
    if (imagePath.startsWith('http')) return imagePath;
    return '${ApiService.baseUrl}$imagePath';
  }
}

class SavedOutfit {
  final String id;
  final String style;
  final String weather;
  final String description;
  final DateTime createdAt;
  final WardrobeItem? top;
  final WardrobeItem? bottom;
  final WardrobeItem? shoes;
  final WardrobeItem? accessory;

  SavedOutfit({
    required this.id,
    required this.style,
    required this.weather,
    required this.description,
    required this.createdAt,
    this.top,
    this.bottom,
    this.shoes,
    this.accessory,
  });

  factory SavedOutfit.fromJson(Map<String, dynamic> json) {
    final items = json['items'] as Map<String, dynamic>? ?? {};
    return SavedOutfit(
      id: json['id'] ?? '',
      style: json['style'] ?? '',
      weather: json['weather'] ?? '',
      description: json['description'] ?? '',
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
      top: items['top'] != null ? WardrobeItem.fromJson(items['top']) : null,
      bottom: items['bottom'] != null ? WardrobeItem.fromJson(items['bottom']) : null,
      shoes: items['shoes'] != null ? WardrobeItem.fromJson(items['shoes']) : null,
      accessory: items['accessory'] != null ? WardrobeItem.fromJson(items['accessory']) : null,
    );
  }
}
