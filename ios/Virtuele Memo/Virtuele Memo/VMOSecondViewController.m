//
//  VMOSecondViewController.m
//  Virtuele Memo
//
//  Created by Stefan Kroon on 16-04-14.
//  Copyright (c) 2014 Stefan Kroon. All rights reserved.
//

#import "VMOSecondViewController.h"
#import "VMOMemoContentVC.h"

@interface VMOSecondViewController ()

@end

@implementation VMOSecondViewController {
    IBOutlet UIView *containerView;
    UIPageViewController *pageViewController;
    
}

- (void)viewDidLoad
{
    [super viewDidLoad];
	// Do any additional setup after loading the view, typically from a nib.
    pageViewController = [self.childViewControllers objectAtIndex:0];
    pageViewController.dataSource = self;
    [pageViewController setViewControllers:@[[self memoContentVC]] direction:UIPageViewControllerNavigationDirectionForward animated:NO completion:nil];
    
    CALayer *layer = containerView.layer;
    layer.masksToBounds = NO;
    //layer.shadowOffset = CGSizeMake(-15, 20);
    layer.shadowOpacity = 0.5;
    layer.shadowRadius = 15;
    layer.shadowColor = [[UIColor greenColor] CGColor];
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (VMOMemoContentVC *)memoContentVC {
    VMOMemoContentVC *memoContentVC = [self.storyboard instantiateViewControllerWithIdentifier:@"MemoContentVC"];
    return memoContentVC;
}

- (UIViewController *)pageViewController:(UIPageViewController *)pageViewController viewControllerAfterViewController:(UIViewController *)viewController {
    return [self memoContentVC];
}

- (UIViewController *)pageViewController:(UIPageViewController *)pageViewController viewControllerBeforeViewController:(UIViewController *)viewController {
    return [self memoContentVC];
}

@end
