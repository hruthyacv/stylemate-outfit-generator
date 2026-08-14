import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static String get baseUrl {
    // Production Render API URL
    return 'https://stylemate-api.onrender.com';
  }

  static String _cookie = '';
  static String? currentUserName;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _cookie = prefs.getString('session_cookie') ?? '';
    currentUserName = prefs.getString('user_name');
  }

  static Future<void> _saveCookie(http.Response response) async {
    final rawCookie = response.headers['set-cookie'];
    if (rawCookie != null) {
      int index = rawCookie.indexOf(';');
      _cookie = (index == -1) ? rawCookie : rawCookie.substring(0, index);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('session_cookie', _cookie);
    }
  }

  static Map<String, String> get _headers {
    return {
      'Content-Type': 'application/json',
      if (_cookie.isNotEmpty) 'Cookie': _cookie,
    };
  }

  // --- Auth ---
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/login'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );
    await _saveCookie(res);
    final data = jsonDecode(res.body);
    if (res.statusCode == 200) {
      currentUserName = data['user']['name'];
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_name', currentUserName!);
    }
    return {...data, 'statusCode': res.statusCode};
  }

  static Future<Map<String, dynamic>> register(String name, String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/register'),
      headers: _headers,
      body: jsonEncode({'name': name, 'email': email, 'password': password}),
    );
    await _saveCookie(res);
    final data = jsonDecode(res.body);
    if (res.statusCode == 200) {
      currentUserName = data['user']['name'];
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_name', currentUserName!);
    }
    return {...data, 'statusCode': res.statusCode};
  }

  static Future<void> logout() async {
    await http.post(Uri.parse('$baseUrl/api/logout'), headers: _headers);
    _cookie = '';
    currentUserName = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('session_cookie');
    await prefs.remove('user_name');
  }

  static Future<bool> checkAuth() async {
    final res = await http.get(Uri.parse('$baseUrl/api/me'), headers: _headers);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      currentUserName = data['user']['name'];
      return true;
    }
    return false;
  }

  // --- Wardrobe ---
  static Future<List<dynamic>> getWardrobe() async {
    final res = await http.get(Uri.parse('$baseUrl/api/wardrobe'), headers: _headers);
    if (res.statusCode == 200) {
      return jsonDecode(res.body)['wardrobe'];
    }
    throw Exception('Failed to load wardrobe');
  }

  static Future<Map<String, dynamic>> uploadItem(String imagePath, Map<String, String> fields) async {
    var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/upload'));
    request.headers.addAll({if (_cookie.isNotEmpty) 'Cookie': _cookie});
    
    request.files.add(await http.MultipartFile.fromPath('image', imagePath));
    request.fields.addAll(fields);

    var streamedResponse = await request.send();
    var response = await http.Response.fromStream(streamedResponse);
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> updateItem(String id, Map<String, String> fields, {String? imagePath}) async {
    var request = http.MultipartRequest('PUT', Uri.parse('$baseUrl/api/wardrobe/$id'));
    request.headers.addAll({if (_cookie.isNotEmpty) 'Cookie': _cookie});
    
    if (imagePath != null && imagePath.isNotEmpty) {
      request.files.add(await http.MultipartFile.fromPath('image', imagePath));
    }
    request.fields.addAll(fields);

    var streamedResponse = await request.send();
    var response = await http.Response.fromStream(streamedResponse);
    return jsonDecode(response.body);
  }

  static Future<bool> deleteItem(String id) async {
    final res = await http.delete(Uri.parse('$baseUrl/api/wardrobe/$id'), headers: _headers);
    return res.statusCode == 200;
  }

  // --- Outfits ---
  static Future<Map<String, dynamic>> generateOutfit(String style, String weather) async {
    final res = await http.get(Uri.parse('$baseUrl/generate?style=$style&weather=$weather'), headers: _headers);
    final data = jsonDecode(res.body);
    if (res.statusCode == 200) return data;
    throw Exception(data['error'] ?? 'Failed to generate');
  }

  static Future<bool> saveOutfit(Map<String, dynamic> payload) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/outfits/save'),
      headers: _headers,
      body: jsonEncode(payload),
    );
    return res.statusCode == 200;
  }

  static Future<List<dynamic>> getSavedOutfits() async {
    final res = await http.get(Uri.parse('$baseUrl/api/outfits'), headers: _headers);
    if (res.statusCode == 200) {
      return jsonDecode(res.body)['outfits'];
    }
    throw Exception('Failed to load saved looks');
  }
}
