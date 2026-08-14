import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'api/api_service.dart';
import 'screens/login_screen.dart';
import 'screens/main_navigation.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.init();
  bool isLoggedIn = await ApiService.checkAuth();
  
  runApp(StyleMateApp(isLoggedIn: isLoggedIn));
}

class StyleMateApp extends StatelessWidget {
  final bool isLoggedIn;
  
  const StyleMateApp({Key? key, required this.isLoggedIn}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StyleMate',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF080808),
        primaryColor: const Color(0xFFdcdcdc),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
          displayLarge: GoogleFonts.greatVibes(
            color: const Color(0xFFdcdcdc),
          ),
          displayMedium: GoogleFonts.cinzel(
            color: const Color(0xFFf5f5f5),
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF080808),
          elevation: 0,
        ),
      ),
      home: isLoggedIn ? const MainNavigation() : const LoginScreen(),
    );
  }
}
